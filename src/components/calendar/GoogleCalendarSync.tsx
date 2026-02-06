import { useEffect } from "react";
import { useAtom } from "jotai";
import { v4 as uuid } from "uuid";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { eventBus } from "@/lib/eventBus";
import { eventsAtom } from "@/state/calendarAtoms";
import type { CalendarEvent, CalendarAction, RecurrenceRule } from "@/types/calendar";

// Helper function to parse Google RRULE UNTIL format (e.g. "20260301T000000Z") into ISO string
const parseUntilDate = (until: string): string | undefined => {
    try {
        // Google uses compact format: 20260301T000000Z or 20260301
        // Convert to standard ISO: 2026-03-01T00:00:00Z
        const cleaned = until.replace("Z", "");
        if (cleaned.length >= 8) {
            const year = cleaned.slice(0, 4);
            const month = cleaned.slice(4, 6);
            const day = cleaned.slice(6, 8);
            let iso = `${year}-${month}-${day}`;
            if (cleaned.length >= 15) {
                const hour = cleaned.slice(9, 11);
                const min = cleaned.slice(11, 13);
                const sec = cleaned.slice(13, 15);
                iso += `T${hour}:${min}:${sec}Z`;
            } else {
                iso += "T00:00:00Z";
            }
            const d = new Date(iso);
            if (isNaN(d.getTime())) return undefined;
            return d.toISOString();
        }
        return undefined;
    } catch {
        return undefined;
    }
};

// Helper function to convert Google Calendar recurrence to our format
const parseRecurrence = (rruleArray?: string[]): RecurrenceRule | undefined => {
    if (!rruleArray || !rruleArray[0]) return undefined;

    const rrule = rruleArray[0]; // Usually just one RRULE
    if (!rrule.startsWith("RRULE:")) return undefined;

    const params = new URLSearchParams(rrule.replace("RRULE:", "").replace(/;/g, "&"));
    const freq = params.get("FREQ") as any;
    const until = params.get("UNTIL");
    const count = params.get("COUNT");
    const interval = params.get("INTERVAL");
    const byday = params.get("BYDAY");

    if (!freq) return undefined;

    return {
        frequency: freq,
        endDate: until ? parseUntilDate(until) : undefined,
        count: count ? parseInt(count) : undefined,
        interval: interval ? parseInt(interval) : 1,
        byDay: byday ? byday.split(",") : undefined,
    };
};

// Helper function to convert our RecurrenceRule to Google Calendar RRULE format
const toRRuleString = (recurrence: RecurrenceRule): string => {
    let rrule = `RRULE:FREQ=${recurrence.frequency}`;

    if (recurrence.interval && recurrence.interval > 1) {
        rrule += `;INTERVAL=${recurrence.interval}`;
    }

    if (recurrence.endDate) {
        const date = new Date(recurrence.endDate);
        const utcString = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        rrule += `;UNTIL=${utcString}`;
    }

    if (recurrence.count) {
        rrule += `;COUNT=${recurrence.count}`;
    }

    if (recurrence.byDay && recurrence.byDay.length > 0) {
        rrule += `;BYDAY=${recurrence.byDay.join(",")}`;
    }

    return rrule;
};


export function GoogleCalendarSync() {
    const { isAuthenticated, isLoading } = useGoogleAuth();
    const [, setEvents] = useAtom(eventsAtom);

    const withRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
        try {
            return await fn();
        } catch (err) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return withRetry(fn, retries - 1, delay * 2);
            }
            throw err;
        }
    };

    // Sync from Google on mount/auth and poll every 60s
    useEffect(() => {
        if (!isAuthenticated || isLoading) return;

        const fetchGoogleEvents = async () => {
            try {
                // Fetch from 7 weeks ago to capture recent history
                const timeMin = new Date();
                timeMin.setDate(timeMin.getDate() - 49); // 7 weeks

                // Fetch recurring event *masters* (singleEvents: false)
                // This gives us the RRULE on recurring events so we can expand them locally
                const [singleResponse, recurringResponse] = await Promise.all([
                    gapi.client.calendar.events.list({
                        'calendarId': 'primary',
                        'timeMin': timeMin.toISOString(),
                        'showDeleted': false,
                        'singleEvents': true,
                        'orderBy': 'startTime'
                    }),
                    gapi.client.calendar.events.list({
                        'calendarId': 'primary',
                        'timeMin': timeMin.toISOString(),
                        'showDeleted': false,
                        'singleEvents': false,
                    }),
                ]);

                const singleItems = singleResponse.result.items || [];
                const recurringItems = recurringResponse.result.items || [];

                // Build a map of recurring master events (those with recurrence[] set)
                const recurringMasters = new Map<string, any>();
                recurringItems.forEach((item: any) => {
                    if (item.recurrence) {
                        recurringMasters.set(item.id, item);
                    }
                });

                // From single events, keep only non-recurring ones (no recurringEventId).
                // Recurring events will be expanded locally from their masters.
                const nonRecurringSingles = singleItems.filter(
                    (gEvent: any) => !gEvent.recurringEventId
                );

                // Combine: non-recurring single events + recurring masters
                const googleEvents = [
                    ...nonRecurringSingles,
                    ...recurringMasters.values(),
                ];

                setEvents(currentEvents => {
                    // Create a map of existing events by googleEventId for quick lookup
                    const existingMap = new Map(currentEvents.map(e => [e.googleEventId, e]));
                    const newEvents = [...currentEvents];
                    let hasChanges = false;

                    googleEvents.forEach((gEvent: any) => {
                        const existingEvent = existingMap.get(gEvent.id);

                        const start = gEvent.start?.dateTime || gEvent.start?.date;
                        const end = gEvent.end?.dateTime || gEvent.end?.date;

                        if (!start || !end) return; // Skip malformed events

                        // Check if we really need to update to avoid unnecessary re-renders
                        if (existingEvent) {
                            if (existingEvent.title === (gEvent.summary || "(No Title)") &&
                                existingEvent.description === gEvent.description &&
                                existingEvent.startDate === start &&
                                existingEvent.endDate === end) {
                                return;
                            }
                        }

                        const recurrence = parseRecurrence(gEvent.recurrence);

                        const mappedEvent: CalendarEvent = {
                            id: existingEvent ? existingEvent.id : uuid(),
                            title: gEvent.summary || "(No Title)",
                            description: gEvent.description,
                            startDate: start,
                            endDate: end,
                            color: "blue",
                            meta: { source: "system" },
                            googleEventId: gEvent.id,
                            recurrence,
                        };

                        if (existingEvent) {
                            const index = newEvents.findIndex(e => e.id === existingEvent.id);
                            if (index !== -1) {
                                newEvents[index] = mappedEvent;
                                hasChanges = true;
                            }
                        } else {
                            newEvents.push(mappedEvent);
                            hasChanges = true;
                        }
                    });

                    return hasChanges ? newEvents : currentEvents;
                });

            } catch (err) {
                console.error("Error fetching Google Calendar events", err);
            }
        };

        fetchGoogleEvents();

        // Auto-sync every 60 seconds
        const intervalId = setInterval(fetchGoogleEvents, 60000);

        return () => clearInterval(intervalId);
    }, [isAuthenticated, isLoading, setEvents]);

    // Sync to Google (Listeners)
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleEventCreated = async (payload: any) => {
            if (payload.type !== 'event.created') return;
            const action = payload.action as CalendarAction;
            if (action.source === 'system') return;
            const { event } = (action as any).payload;

            try {
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const resource: any = {
                    summary: event.title,
                    description: event.description,
                    start: { dateTime: event.startDate, timeZone },
                    end: { dateTime: event.endDate, timeZone },
                };

                // Add recurrence if present
                if (event.recurrence) {
                    resource.recurrence = [toRRuleString(event.recurrence)];
                }

                const response = await withRetry(() => gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource,
                }));

                setEvents(prev => prev.map(e =>
                    e.id === event.id ? {
                        ...e,
                        googleEventId: response.result.id,
                        meta: { ...e.meta, source: "system" } as any,
                        // Prefer the recurrence from Google's response, fall back to our local copy
                        recurrence: parseRecurrence(response.result.recurrence) ?? e.recurrence,
                    } : e
                ));
                console.log("Successfully created Google event", response.result.id);
            } catch (err) {
                console.error("Error creating Google event", err);
            }
        };

        const handleEventUpdated = async (payload: any) => {
            if (payload.type !== 'event.updated' && payload.type !== 'event.moved') return;
            const action = payload.action as CalendarAction;

            if (action.source === 'system') return;
            const { after } = (action as any).payload;
            if (!after.googleEventId) return;

            try {
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const resource: any = {
                    summary: after.title,
                    description: after.description,
                    start: { dateTime: after.startDate, timeZone },
                    end: { dateTime: after.endDate, timeZone },
                };

                // Add recurrence if present
                if (after.recurrence) {
                    resource.recurrence = [toRRuleString(after.recurrence)];
                } else {
                    // Remove recurrence if it was removed
                    resource.recurrence = [];
                }

                await withRetry(() => gapi.client.calendar.events.patch({
                    calendarId: 'primary',
                    eventId: after.googleEventId,
                    resource,
                }));
                console.log("Successfully updated Google event", after.googleEventId);
            } catch (err) {
                console.error("Error updating Google event", err);
            }
        };

        const handleHistoryAction = async (payload: any) => {
            const { action } = payload;
            if (payload.type === 'history.undone') {
                // If we undone an ADD, we should DELETE in Google
                if (action.type === 'ADD_EVENT') {
                    const { event } = action.payload;
                    if (event.googleEventId) {
                        try {
                            await withRetry(() => gapi.client.calendar.events.delete({
                                calendarId: 'primary',
                                eventId: event.googleEventId
                            }));
                        } catch (err) { console.error("Error undoing Google event create", err); }
                    }
                }
                // If we undone a DELETE, we should CREATE in Google
                else if (action.type === 'DELETE_EVENT') {
                    const { event } = action.payload;
                    handleEventCreated({ type: 'event.created', action: { ...action, payload: { event } } });
                }
                // If we undone an UPDATE, we should UPDATE in Google (to 'before' state)
                // Handles both recurring and non-recurring events
                else if (action.type === 'UPDATE_EVENT' || action.type === 'MOVE_EVENT') {
                    const { before } = action.payload;
                    handleEventUpdated({ type: 'event.updated', action: { ...action, payload: { after: before } } });
                }
            } else if (payload.type === 'history.redone') {
                // Similar logic for Redo
                if (action.type === 'ADD_EVENT') {
                    handleEventCreated({ type: 'event.created', action });
                } else if (action.type === 'DELETE_EVENT') {
                    handleEventDeleted({ type: 'event.deleted', action });
                } else if (action.type === 'UPDATE_EVENT' || action.type === 'MOVE_EVENT') {
                    handleEventUpdated({ type: 'event.updated', action });
                }
            }
        };

        const handleEventDeleted = async (payload: any) => {
            if (payload.type !== 'event.deleted') return;
            const action = payload.action as CalendarAction;

            if (action.source === 'system') return;
            const { event } = (action as any).payload;
            if (!event.googleEventId) return;

            try {
                await gapi.client.calendar.events.delete({
                    calendarId: 'primary',
                    eventId: event.googleEventId
                });
            } catch (err) {
                console.error("Error deleting Google event", err);
            }
        };

        // We should also handle moved events (same as Updated really)
        const handleEventMoved = async (payload: any) => {
            // Re-use update logic
            handleEventUpdated(payload);
        };

        const unsubCreated = eventBus.subscribe("event.created", handleEventCreated);
        const unsubUpdated = eventBus.subscribe("event.updated", handleEventUpdated);
        const unsubDeleted = eventBus.subscribe("event.deleted", handleEventDeleted);
        const unsubMoved = eventBus.subscribe("event.moved", handleEventMoved);
        const unsubUndone = eventBus.subscribe("history.undone", handleHistoryAction);
        const unsubRedone = eventBus.subscribe("history.redone", handleHistoryAction);

        return () => {
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            unsubMoved();
            unsubUndone();
            unsubRedone();
        };
    }, [isAuthenticated, setEvents]);

    return null; // Headless component
}
