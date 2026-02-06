import { useEffect } from "react";
import { useAtom } from "jotai";
import { v4 as uuid } from "uuid";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { eventBus } from "@/lib/eventBus";
import { eventsAtom } from "@/state/calendarAtoms";
import type { CalendarEvent, CalendarAction } from "@/types/calendar";

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
                // Fetch from 7 weeks ago to capture recent history as requested
                const timeMin = new Date();
                timeMin.setDate(timeMin.getDate() - 49); // 7 weeks

                const response = await gapi.client.calendar.events.list({
                    'calendarId': 'primary',
                    'timeMin': timeMin.toISOString(),
                    'showDeleted': false,
                    'singleEvents': true,
                    'orderBy': 'startTime'
                });

                const googleEvents = response.result.items || [];

                setEvents(currentEvents => {
                    // Create a map of existing events by googleEventId for quick lookup
                    const existingMap = new Map(currentEvents.map(e => [e.googleEventId, e]));
                    const newEvents = [...currentEvents];
                    let hasChanges = false;

                    googleEvents.forEach((gEvent: any) => {
                        const existingEvent = existingMap.get(gEvent.id);

                        // If event exists and hasn't changed, skip
                        // Simple check on update time or just always update if exists to be safe
                        // For this implementation, we'll upsert.

                        const start = gEvent.start.dateTime || gEvent.start.date;
                        const end = gEvent.end.dateTime || gEvent.end.date;

                        // Check if we really need to update to avoid unnecessary re-renders/loops
                        // (Ideally we compare etags or updated timestamps, but basic props check helps)
                        if (existingEvent) {
                            if (existingEvent.title === gEvent.summary &&
                                existingEvent.description === gEvent.description &&
                                existingEvent.startDate === start &&
                                existingEvent.endDate === end) {
                                return;
                            }
                        }

                        const mappedEvent: CalendarEvent = {
                            id: existingEvent ? existingEvent.id : uuid(),
                            title: gEvent.summary || "(No Title)",
                            description: gEvent.description,
                            startDate: start,
                            endDate: end,
                            color: "blue",
                            meta: { source: "system" },
                            googleEventId: gEvent.id
                        };

                        if (existingEvent) {
                            // Update existing
                            const index = newEvents.findIndex(e => e.id === existingEvent.id);
                            if (index !== -1) {
                                newEvents[index] = mappedEvent;
                                hasChanges = true;
                            }
                        } else {
                            // Add new
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
                const response = await withRetry(() => gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: {
                        summary: event.title,
                        description: event.description,
                        start: { dateTime: event.startDate },
                        end: { dateTime: event.endDate },
                    }
                }));

                setEvents(prev => prev.map(e =>
                    e.id === event.id ? { ...e, googleEventId: response.result.id, meta: { ...e.meta, source: "system" } as any } : e
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
                await withRetry(() => gapi.client.calendar.events.patch({
                    calendarId: 'primary',
                    eventId: after.googleEventId,
                    resource: {
                        summary: after.title,
                        description: after.description,
                        start: { dateTime: after.startDate },
                        end: { dateTime: after.endDate },
                    }
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
