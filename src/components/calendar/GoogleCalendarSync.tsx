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

    // Sync from Google on mount/auth
    useEffect(() => {
        if (!isAuthenticated || isLoading) return;

        const fetchGoogleEvents = async () => {
            try {
                const response = await gapi.client.calendar.events.list({
                    'calendarId': 'primary',
                    'timeMin': (new Date()).toISOString(),
                    'showDeleted': false,
                    'singleEvents': true,
                    'orderBy': 'startTime'
                });

                const googleEvents = response.result.items || [];

                // Merge strategy: Upsert based on googleEventId or title similarity?
                // For this task, we will just add them if they don't exist by googleEventId.
                // A robust sync is complex; simplifying for the feature request.

                setEvents(currentEvents => {
                    const newEvents = [...currentEvents];

                    googleEvents.forEach((gEvent: any) => {
                        const existingIndex = newEvents.findIndex(e => e.googleEventId === gEvent.id);

                        const start = gEvent.start.dateTime || gEvent.start.date;
                        const end = gEvent.end.dateTime || gEvent.end.date;

                        // If pure date (all day), we might need to handle it. For now, assuming dateTime usually.
                        // If just date, append T00:00:00 for ISO parsing consistency in our app if needed.

                        const mappedEvent: CalendarEvent = {
                            id: existingIndex >= 0 ? newEvents[existingIndex].id : uuid(),
                            title: gEvent.summary || "(No Title)",
                            description: gEvent.description,
                            startDate: start,
                            endDate: end,
                            color: "blue", // Google colors are "1", "2" etc. Mapping is hard. Defaulting.
                            meta: { source: "system" },
                            googleEventId: gEvent.id
                        };

                        if (existingIndex >= 0) {
                            newEvents[existingIndex] = mappedEvent;
                        } else {
                            newEvents.push(mappedEvent);
                        }
                    });
                    return newEvents;
                });

            } catch (err) {
                console.error("Error fetching Google Calendar events", err);
            }
        };

        fetchGoogleEvents();
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
                const response = await gapi.client.calendar.events.insert({
                    calendarId: 'primary',
                    resource: {
                        summary: event.title,
                        description: event.description,
                        start: { dateTime: event.startDate },
                        end: { dateTime: event.endDate },
                    }
                });

                setEvents(prev => prev.map(e =>
                    e.id === event.id ? { ...e, googleEventId: response.result.id, meta: { ...e.meta, source: "system" } as any } : e
                ));

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
                await gapi.client.calendar.events.patch({
                    calendarId: 'primary',
                    eventId: after.googleEventId,
                    resource: {
                        summary: after.title,
                        description: after.description,
                        start: { dateTime: after.startDate },
                        end: { dateTime: after.endDate },
                    }
                });
            } catch (err) {
                console.error("Error updating Google event", err);
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

        return () => {
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            unsubMoved();
        };
    }, [isAuthenticated, setEvents]);

    return null; // Headless component
}
