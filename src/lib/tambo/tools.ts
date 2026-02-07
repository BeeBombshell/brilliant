import { z } from 'zod';
import { getDefaultStore } from 'jotai';
import { v4 as uuid } from 'uuid';
import { eventsAtom } from '@/state/calendarAtoms';
import { executeCalendarActionAtom } from '@/state/calendarEffects';
import type { CalendarEvent, CalendarAction, EventColor, RecurrenceRule } from '@/types/calendar';
import type { TamboTool } from '@tambo-ai/react';
import {
    CreateEventSchema,
    CreateEventOutputSchema,
    GetEventsSchema,
    GetEventsOutputSchema,
    UpdateEventSchema,
    UpdateEventOutputSchema,
    DeleteEventSchema,
    DeleteEventOutputSchema,
    ReorganizeEventsSchema,
    ReorganizeOutputSchema,
    CreateRecurringEventSchema,
    CreateRecurringEventOutputSchema,
} from './schemas';

export const tamboTools: TamboTool<any, any, []>[] = [
    {
        name: 'createCalendarEvent',
        title: 'Create Calendar Event',
        description: 'Create a new event in the user\'s calendar, optionally with recurrence',
        inputSchema: CreateEventSchema,
        outputSchema: CreateEventOutputSchema,
        tool: async ({ summary, startDateTime, endDateTime, description, location, attendees, color, meetingLinkRequested, recurrence }: z.infer<typeof CreateEventSchema>) => {
            const store = getDefaultStore();
            const event: CalendarEvent = {
                id: uuid(),
                title: summary,
                startDate: startDateTime,
                endDate: endDateTime,
                description,
                location,
                attendees: attendees?.map(email => ({ email })),
                color: (color as EventColor) ?? 'blue',
                meetingLinkRequested,
                meta: { source: 'ai' },
                recurrence: recurrence as RecurrenceRule | undefined,
            };

            const action: CalendarAction = {
                id: uuid(),
                type: 'ADD_EVENT',
                timestamp: new Date().toISOString(),
                source: 'ai',
                payload: { event },
            };

            store.set(eventsAtom, (prev) => [...prev, event]);
            store.set(executeCalendarActionAtom, action);

            const recurrenceInfo = recurrence ? ` (recurring ${recurrence.frequency.toLowerCase()}${recurrence.count ? ` for ${recurrence.count} times` : ''})` : '';
            return {
                success: true,
                message: `Created event "${summary}"${recurrenceInfo}`,
                eventId: event.id,
            };
        }
    },
    {
        name: 'getCalendarEvents',
        title: 'Get Calendar Events',
        description: 'Retrieve events from the user\'s calendar for a specific time range',
        inputSchema: GetEventsSchema,
        outputSchema: GetEventsOutputSchema,
        tool: async ({ startDate, endDate }: z.infer<typeof GetEventsSchema>) => {
            const store = getDefaultStore();
            const allEvents = store.get(eventsAtom);

            const start = new Date(startDate);
            const end = new Date(endDate);

            console.log('Searching for events between', start.toISOString(), 'and', end.toISOString());
            console.log('Total events in store:', allEvents.length);

            const filtered = allEvents.filter(e => {
                const eStart = new Date(e.startDate);
                const eEnd = new Date(e.endDate);

                // Overlap condition: (StartA < EndB) && (EndA > StartB)
                return (eStart < end) && (eEnd > start);
            });

            const eventList = filtered
                .map(e => `${e.title} [${new Date(e.startDate).getHours()}:${String(new Date(e.startDate).getMinutes()).padStart(2, '0')}]`)
                .join(', ');

            return {
                success: true,
                events: filtered,
                message: filtered.length > 0
                    ? `Found ${filtered.length} events: ${eventList}`
                    : `No events found between ${start.toLocaleString()} and ${end.toLocaleString()}.`,
            };
        }
    },
    {
        name: 'updateCalendarEvent',
        title: 'Update Calendar Event',
        description: 'Update an existing calendar event or modify its recurrence pattern',
        inputSchema: UpdateEventSchema,
        outputSchema: UpdateEventOutputSchema,
        tool: async (patch: z.infer<typeof UpdateEventSchema>) => {
            const store = getDefaultStore();
            const allEvents = store.get(eventsAtom);
            const existing = allEvents.find(e => e.id === patch.id);

            if (!existing) {
                return { success: false, message: `Event with ID ${patch.id} not found` };
            }

            const updated: CalendarEvent = {
                ...existing,
                title: patch.title ?? existing.title,
                startDate: patch.startDate ?? existing.startDate,
                endDate: patch.endDate ?? existing.endDate,
                description: patch.description ?? existing.description,
                location: patch.location ?? existing.location,
                attendees: patch.attendees ? patch.attendees.map(email => ({ email })) : existing.attendees,
                color: (patch.color as EventColor) ?? existing.color,
                meetingLinkRequested: patch.meetingLinkRequested ?? existing.meetingLinkRequested,
                recurrence: patch.recurrence ? (patch.recurrence as RecurrenceRule) : existing.recurrence,
                meta: { source: 'ai' }
            };

            const action: CalendarAction = {
                id: uuid(),
                type: 'UPDATE_EVENT',
                timestamp: new Date().toISOString(),
                source: 'ai',
                payload: { before: existing, after: updated },
            };

            store.set(eventsAtom, (prev) => prev.map(e => e.id === patch.id ? updated : e));
            store.set(executeCalendarActionAtom, action);

            return {
                success: true,
                message: `Updated event "${updated.title}"`,
            };
        }
    },
    {
        name: 'deleteCalendarEvent',
        title: 'Delete Calendar Event',
        description: 'Remove an event from the calendar',
        inputSchema: DeleteEventSchema,
        outputSchema: DeleteEventOutputSchema,
        tool: async ({ id }: z.infer<typeof DeleteEventSchema>) => {
            const store = getDefaultStore();
            const allEvents = store.get(eventsAtom);
            const existing = allEvents.find(e => e.id === id);

            if (!existing) {
                return { success: false, message: `Event with ID ${id} not found` };
            }

            const action: CalendarAction = {
                id: uuid(),
                type: 'DELETE_EVENT',
                timestamp: new Date().toISOString(),
                source: 'ai',
                payload: { event: existing },
            };

            store.set(eventsAtom, (prev) => prev.filter(e => e.id !== id));
            store.set(executeCalendarActionAtom, action);

            return {
                success: true,
                message: `Deleted event "${existing.title}"`,
            };
        }
    },
    {
        name: 'reorganizeEvents',
        title: 'Reorganize Events',
        description: 'Perform multiple calendar actions (create, update, delete) at once to reorganize the schedule',
        inputSchema: ReorganizeEventsSchema,
        outputSchema: ReorganizeOutputSchema,
        tool: async ({ actions, explanation }: z.infer<typeof ReorganizeEventsSchema>) => {
            const store = getDefaultStore();
            const timestamp = new Date().toISOString();
            let actionCount = 0;

            for (const actionData of actions) {
                const currentEvents = store.get(eventsAtom);

                if (actionData.type === 'create') {
                    const event: CalendarEvent = {
                        id: uuid(),
                        title: actionData.event.summary,
                        startDate: actionData.event.startDateTime,
                        endDate: actionData.event.endDateTime,
                        description: actionData.event.description,
                        location: actionData.event.location,
                        attendees: actionData.event.attendees?.map(email => ({ email })),
                        color: (actionData.event.color as EventColor) ?? 'purple',
                        meetingLinkRequested: actionData.event.meetingLinkRequested,
                        meta: { source: 'ai' }
                    };
                    const action: CalendarAction = {
                        id: uuid(),
                        type: 'ADD_EVENT',
                        timestamp,
                        source: 'ai',
                        explanation,
                        payload: { event },
                    };
                    store.set(eventsAtom, (prev) => [...prev, event]);
                    store.set(executeCalendarActionAtom, action);
                }
                else if (actionData.type === 'update') {
                    const existing = currentEvents.find(e => e.id === actionData.patch.id);
                    if (existing) {
                        const updated: CalendarEvent = {
                            ...existing,
                            title: actionData.patch.title ?? existing.title,
                            startDate: actionData.patch.startDate ?? existing.startDate,
                            endDate: actionData.patch.endDate ?? existing.endDate,
                            description: actionData.patch.description ?? existing.description,
                            location: actionData.patch.location ?? existing.location,
                            attendees: actionData.patch.attendees ? actionData.patch.attendees.map(email => ({ email })) : existing.attendees,
                            color: (actionData.patch.color as EventColor) ?? existing.color,
                            meetingLinkRequested: actionData.patch.meetingLinkRequested ?? existing.meetingLinkRequested,
                            meta: { source: 'ai' }
                        };
                        const action: CalendarAction = {
                            id: uuid(),
                            type: 'UPDATE_EVENT',
                            timestamp,
                            source: 'ai',
                            explanation,
                            payload: { before: existing, after: updated },
                        };
                        store.set(eventsAtom, (prev) => prev.map(e => e.id === actionData.patch.id ? updated : e));
                        store.set(executeCalendarActionAtom, action);
                    }
                }
                else if (actionData.type === 'delete') {
                    const existing = currentEvents.find(e => e.id === actionData.id);
                    if (existing) {
                        const action: CalendarAction = {
                            id: uuid(),
                            type: 'DELETE_EVENT',
                            timestamp,
                            source: 'ai',
                            explanation,
                            payload: { event: existing },
                        };
                        store.set(eventsAtom, (prev) => prev.filter(e => e.id !== actionData.id));
                        store.set(executeCalendarActionAtom, action);
                    }
                }
                actionCount++;
            }

            return {
                success: true,
                message: `Reorganized schedule with ${actionCount} changes.`,
                actionCount,
            };
        }
    },
    {
        name: 'createRecurringEvent',
        title: 'Create Recurring Event',
        description: 'Create a recurring event with a daily, weekly, monthly, or yearly pattern. Use this when the user wants an event that repeats.',
        inputSchema: CreateRecurringEventSchema,
        outputSchema: CreateRecurringEventOutputSchema,
        tool: async ({ summary, startDateTime, endDateTime, recurrence, description, location, attendees, color, meetingLinkRequested }: z.infer<typeof CreateRecurringEventSchema>) => {
            const store = getDefaultStore();
            const event: CalendarEvent = {
                id: uuid(),
                title: summary,
                startDate: startDateTime,
                endDate: endDateTime,
                description,
                location,
                attendees: attendees?.map(email => ({ email })),
                color: (color as EventColor) ?? 'purple',
                meetingLinkRequested,
                meta: { source: 'ai' },
                recurrence: recurrence as RecurrenceRule,
            };

            const action: CalendarAction = {
                id: uuid(),
                type: 'ADD_EVENT',
                timestamp: new Date().toISOString(),
                source: 'ai',
                explanation: `Created recurring event: ${summary}`,
                payload: { event },
            };

            store.set(eventsAtom, (prev) => [...prev, event]);
            store.set(executeCalendarActionAtom, action);

            const recurrenceDescription = [
                recurrence.frequency.toLowerCase(),
                recurrence.byDay ? `on ${recurrence.byDay.join(', ')}` : '',
                recurrence.count ? `for ${recurrence.count} occurrences` : '',
                recurrence.endDate ? `until ${new Date(recurrence.endDate).toLocaleDateString()}` : '',
                recurrence.interval && recurrence.interval > 1 ? `every ${recurrence.interval} periods` : '',
            ].filter(Boolean).join(' ');

            return {
                success: true,
                message: `Created recurring event "${summary}" (${recurrenceDescription})`,
                eventId: event.id,
            };
        }
    }
];