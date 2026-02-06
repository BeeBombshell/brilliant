import { z } from 'zod';
import { getDefaultStore } from 'jotai';
import { v4 as uuid } from 'uuid';
import { eventsAtom, actionHistoryAtom } from '@/state/calendarAtoms';
import { eventBus } from '@/lib/eventBus';
import type { CalendarEvent, CalendarAction, EventColor } from '@/types/calendar';

// Define the type for the time block types to ensure consistency
const TimeBlockTypeEnum = z.enum(['deep-work', 'meeting', 'email', 'break']);
type TimeBlockType = z.infer<typeof TimeBlockTypeEnum>;

// --- Component Props Schemas ---

const ScheduleBlockSchema = z.object({
    title: z.string().describe('Name of the activity or task'),
    startTime: z.string().describe('Start time in ISO format'),
    endTime: z.string().describe('End time in ISO format'),
    type: TimeBlockTypeEnum.describe('Type of time block'),
    description: z.string().optional().describe('Additional details about the block'),
});

const EventCardSchema = z.object({
    title: z.string().describe('Event title'),
    startDate: z.string().describe('Start date/time in ISO format'),
    endDate: z.string().describe('End date/time in ISO format'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('List of attendees'),
});

const WeekScheduleSchema = z.object({
    weekStart: z.string().describe('Start of the week in ISO format'),
    blocks: z.array(z.object({
        day: z.string(),
        title: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        type: TimeBlockTypeEnum,
    })).describe('Array of time blocks for the week'),
});

// --- Tool Input Schemas ---

const CreateEventSchema = z.object({
    summary: z.string().describe('Event title'),
    startDateTime: z.string().describe('Start date/time in ISO format'),
    endDateTime: z.string().describe('End date/time in ISO format'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('Email addresses of attendees'),
});

const GetEventsSchema = z.object({
    startDate: z.string().describe('Start date in ISO format'),
    endDate: z.string().describe('End date in ISO format'),
});

const UpdateEventSchema = z.object({
    id: z.string().describe('ID of the event to update'),
    title: z.string().optional().describe('New event title'),
    startDate: z.string().optional().describe('New start date/time in ISO format'),
    endDate: z.string().optional().describe('New end date/time in ISO format'),
    description: z.string().optional().describe('New event description'),
    color: z.enum(['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'gray']).optional().describe('Event color'),
});

const DeleteEventSchema = z.object({
    id: z.string().describe('ID of the event to delete'),
});

const ReorganizeEventsSchema = z.object({
    actions: z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('create'),
            event: CreateEventSchema
        }),
        z.object({
            type: z.literal('update'),
            patch: UpdateEventSchema
        }),
        z.object({
            type: z.literal('delete'),
            id: z.string()
        }),
    ])).describe('Array of actions to apply to the calendar'),
    explanation: z.string().optional().describe('Brief explanation of the reorganization logic'),
});

const SuggestBlocksSchema = z.object({
    goals: z.string().describe('User\'s goals or preferences'),
    numberOfBlocks: z.number().optional().describe('Number of time blocks to suggest'),
    blockDuration: z.number().optional().describe('Duration of each block in minutes'),
});

// --- Tool Output Schemas ---

const CreateEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    eventId: z.string().optional(),
});

const GetEventsOutputSchema = z.object({
    success: z.boolean(),
    events: z.array(z.any()),
    message: z.string(),
});

const UpdateEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

const DeleteEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

const ReorganizeOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    actionCount: z.number(),
});

const SuggestBlocksOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    blocks: z.array(z.any()),
});

// --- Main Exports ---

// Define your calendar-related components that Tambo can render
export const tamboComponents = [
    {
        name: 'ScheduleBlock',
        description: 'Display a time block for focused work or activities',
        component: ScheduleBlock,
        propsSchema: ScheduleBlockSchema,
    },
    {
        name: 'EventCard',
        description: 'Display a calendar event with details',
        component: EventCard,
        propsSchema: EventCardSchema,
    },
    {
        name: 'WeekSchedule',
        description: 'Display a full week schedule with multiple time blocks',
        component: WeekSchedule,
        propsSchema: WeekScheduleSchema,
    }
];

// Define tools that Tambo can use to interact with your calendar
export const tamboTools = [
    {
        name: 'createCalendarEvent',
        title: 'Create Calendar Event',
        description: 'Create a new event in the user\'s calendar',
        inputSchema: CreateEventSchema,
        outputSchema: CreateEventOutputSchema,
        tool: async ({ summary, startDateTime, endDateTime, description }: z.infer<typeof CreateEventSchema>) => {
            const store = getDefaultStore();
            const event: CalendarEvent = {
                id: uuid(),
                title: summary,
                startDate: startDateTime,
                endDate: endDateTime,
                description,
                color: 'blue',
                meta: { source: 'ai' }
            };

            const action: CalendarAction = {
                id: uuid(),
                type: 'ADD_EVENT',
                timestamp: new Date().toISOString(),
                source: 'ai',
                payload: { event },
            };

            store.set(eventsAtom, (prev) => [...prev, event]);
            store.set(actionHistoryAtom, (prev) => [...prev, action]);
            eventBus.emit({ type: 'event.created', action });

            return {
                success: true,
                message: `Created event "${summary}"`,
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
        description: 'Update an existing calendar event',
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
                color: (patch.color as EventColor) ?? existing.color,
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
            store.set(actionHistoryAtom, (prev) => [...prev, action]);
            eventBus.emit({ type: 'event.updated', action });

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
            store.set(actionHistoryAtom, (prev) => [...prev, action]);
            eventBus.emit({ type: 'event.deleted', action });

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
                        color: 'purple', // Reorganized events get a distinct color
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
                    store.set(actionHistoryAtom, (prev) => [...prev, action]);
                    eventBus.emit({ type: 'event.created', action });
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
                            color: (actionData.patch.color as EventColor) ?? existing.color,
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
                        store.set(actionHistoryAtom, (prev) => [...prev, action]);
                        eventBus.emit({ type: 'event.updated', action });
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
                        store.set(actionHistoryAtom, (prev) => [...prev, action]);
                        eventBus.emit({ type: 'event.deleted', action });
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
        name: 'suggestTimeBlocks',
        title: 'Suggest Time Blocks',
        description: 'Suggest optimal time blocks based on user goals and existing calendar',
        inputSchema: SuggestBlocksSchema,
        outputSchema: SuggestBlocksOutputSchema,
        tool: async ({ goals, numberOfBlocks = 3, blockDuration = 90 }: z.infer<typeof SuggestBlocksSchema>) => {
            const store = getDefaultStore();
            const events = store.get(eventsAtom);

            // In a real scenario, this would involve a complex algorithm.
            // For now, we return the existing events so the AI can reason about them
            // or we could suggest some mock blocks.
            console.log('Suggesting time blocks for:', goals, 'count:', numberOfBlocks, 'duration:', blockDuration);

            return {
                success: true,
                message: `Analyzing calendar to suggest ${numberOfBlocks} time blocks for: ${goals}`,
                blocks: events.map(e => ({
                    title: e.title,
                    startTime: e.startDate,
                    endTime: e.endDate,
                    type: 'deep-work'
                })).slice(0, numberOfBlocks),
            };
        }
    }
];

// Example component for ScheduleBlock
export function ScheduleBlock({ title, startTime, endTime, type, description }: z.infer<typeof ScheduleBlockSchema>) {
    const typeColors: Record<TimeBlockType, string> = {
        'deep-work': 'bg-blue-100 border-blue-300 text-blue-900',
        'meeting': 'bg-purple-100 border-purple-300 text-purple-900',
        'email': 'bg-green-100 border-green-300 text-green-900',
        'break': 'bg-gray-100 border-gray-300 text-gray-900',
    };

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    return (
        <div className={`rounded-lg border-2 p-4 ${typeColors[type]}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm opacity-75">
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                        {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="ml-2">({duration} min)</span>
                    </p>
                    {description && (
                        <p className="mt-2 text-sm">{description}</p>
                    )}
                </div>
                <span className="rounded-full bg-white/50 px-2 py-1 text-xs font-medium capitalize">
                    {type.replace('-', ' ')}
                </span>
            </div>
        </div>
    );
}

// Example component for EventCard
export function EventCard({ title, startDate, endDate, location, attendees }: z.infer<typeof EventCardSchema>) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">{title}</h3>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>📅 {start.toLocaleDateString()}</p>
                <p>
                    {/* eslint-disable-next-line @typescript-eslint/no-irregular-whitespace */}
                    🕐 {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                    {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {location && <p>📍 {location}</p>}
                {attendees && attendees.length > 0 && (
                    <p>👥 {attendees.join(', ')}</p>
                )}
            </div>
        </div>
    );
}

// Example component for WeekSchedule
export function WeekSchedule({ weekStart, blocks }: z.infer<typeof WeekScheduleSchema>) {
    const week = new Date(weekStart);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">
                Week of {week.toLocaleDateString()}
            </h3>
            <div className="space-y-2">
                {blocks.map((block, idx) => (
                    <ScheduleBlock
                        key={idx}
                        title={block.title}
                        startTime={block.startTime}
                        endTime={block.endTime}
                        type={block.type as TimeBlockType}
                    />
                ))}
            </div>
        </div>
    );
}
