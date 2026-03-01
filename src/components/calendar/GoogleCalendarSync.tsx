import { useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { v4 as uuid } from "uuid";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { calendarActionQueueAtom } from "@/state/calendarEffects";
import { eventsAtom, pendingDeletesAtom } from "@/state/calendarAtoms";
import type { CalendarEvent, CalendarAction, RecurrenceRule, EventAttendee, EventPerson, EventColor } from "@/types/calendar";

const googleColorIdToEventColor: Record<string, EventColor> = {
    "1": "blue",
    "2": "green",
    "3": "purple",
    "4": "red",
    "5": "yellow",
    "6": "orange",
    "7": "gray",
    "8": "blue",
    "9": "green",
    "10": "red",
    "11": "gray",
};

const eventColorToGoogleColorId: Record<EventColor, string> = {
    blue: "1",
    green: "2",
    purple: "3",
    red: "4",
    yellow: "5",
    orange: "6",
    gray: "7",
};

const isHttpUrl = (value?: string): boolean => {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const extractMeetingLink = (gEvent: any): string | undefined => {
    if (gEvent?.hangoutLink) return gEvent.hangoutLink;
    const entryPoint = gEvent?.conferenceData?.entryPoints?.find((entry: any) => entry?.uri);
    if (entryPoint?.uri) return entryPoint.uri;
    if (isHttpUrl(gEvent?.location)) return gEvent.location;
    return undefined;
};

const mapPerson = (person?: any): EventPerson | undefined => {
    if (!person) return undefined;
    const mapped: EventPerson = {
        name: person.displayName,
        email: person.email,
        self: person.self,
    };
    if (!mapped.name && !mapped.email) return undefined;
    return mapped;
};

const mapAttendees = (attendees?: any[]): EventAttendee[] | undefined => {
    if (!attendees || attendees.length === 0) return undefined;
    return attendees
        .filter(attendee => attendee?.email)
        .map(attendee => ({
            email: attendee.email,
            name: attendee.displayName,
            responseStatus: attendee.responseStatus,
            optional: attendee.optional,
            organizer: attendee.organizer,
            self: attendee.self,
        }));
};

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


// Retry utility for API calls - defined outside component since it's a pure function
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

export function GoogleCalendarSync() {
    const { isAuthenticated, isLoading } = useGoogleAuth();
    const [, setEvents] = useAtom(eventsAtom);
    const [actionQueue, setActionQueue] = useAtom(calendarActionQueueAtom);
    const [pendingDeletes, setPendingDeletes] = useAtom(pendingDeletesAtom);

    // Map a Google Event to our local CalendarEvent format
    const mapGoogleToLocal = useCallback((gEvent: any, existingId?: string): CalendarEvent | null => {
        const start = gEvent.start?.dateTime || gEvent.start?.date;
        const end = gEvent.end?.dateTime || gEvent.end?.date;

        if (!start || !end) {
            console.warn("Skipping Google Calendar event missing start/end", gEvent?.id);
            return null;
        }

        const recurrence = parseRecurrence(gEvent.recurrence);

        return {
            id: existingId || uuid(),
            title: gEvent.summary || "(No Title)",
            description: gEvent.description,
            meetingLink: extractMeetingLink(gEvent),
            location: gEvent.location,
            startDate: start,
            endDate: end,
            color: googleColorIdToEventColor[String(gEvent.colorId)] ?? "blue",
            meta: { source: "system" },
            googleEventId: gEvent.id,
            organizer: mapPerson(gEvent.organizer),
            creator: mapPerson(gEvent.creator),
            attendees: mapAttendees(gEvent.attendees),
            recurrence,
        };
    }, []);

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

                const googleIdsInResponse = new Set(googleEvents.map(g => g.id));

                setEvents(currentEvents => {
                    const existingGoogleIdMap = new Map(
                        currentEvents.filter(e => e.googleEventId).map(e => [e.googleEventId!, e])
                    );

                    const resolvedEvents: CalendarEvent[] = [];
                    let hasChanges = false;

                    // 1. Process events coming from Google
                    googleEvents.forEach(gEvent => {
                        // Skip if we just deleted this in our local session
                        if (pendingDeletes.has(gEvent.id)) return;

                        const existing = existingGoogleIdMap.get(gEvent.id);
                        const mapped = mapGoogleToLocal(gEvent, existing?.id);
                        if (!mapped) return;

                        if (existing) {
                            // Only update if something changed
                            const isDifferent =
                                existing.title !== mapped.title ||
                                existing.startDate !== mapped.startDate ||
                                existing.endDate !== mapped.endDate ||
                                existing.description !== mapped.description ||
                                existing.location !== mapped.location ||
                                existing.color !== mapped.color;

                            if (isDifferent) {
                                resolvedEvents.push(mapped);
                                hasChanges = true;
                            } else {
                                resolvedEvents.push(existing);
                            }
                        } else {
                            // Truly new event from Google
                            resolvedEvents.push(mapped);
                            hasChanges = true;
                        }
                    });

                    // 2. Process local events that aren't in the Google response
                    currentEvents.forEach(localEvent => {
                        if (!localEvent.googleEventId) {
                            // Local-only/New event not yet synced to Google - KEEP
                            resolvedEvents.push(localEvent);
                        } else {
                            // Event HAS a googleEventId but ISN'T in the Google response anymore
                            if (!googleIdsInResponse.has(localEvent.googleEventId)) {
                                // It was deleted in Google - REMOVE locally
                                hasChanges = true;
                                // We don't push it to resolvedEvents
                            }
                        }
                    });

                    return hasChanges ? resolvedEvents : currentEvents;
                });

                // Cleanup pendingDeletes: if an ID is in pendingDeletes but NOT in the Google response,
                // it means the deletion has been confirmed by Google.
                setPendingDeletes(prev => {
                    const next = new Set(prev);
                    let setChanged = false;
                    prev.forEach(id => {
                        if (!googleIdsInResponse.has(id)) {
                            next.delete(id);
                            setChanged = true;
                        }
                    });
                    return setChanged ? next : prev;
                });

            } catch (err) {
                console.error("Error fetching Google Calendar events", err);
            }
        };

        fetchGoogleEvents();

        // Auto-sync every 60 seconds
        const intervalId = setInterval(fetchGoogleEvents, 60000);

        return () => clearInterval(intervalId);
    }, [isAuthenticated, isLoading, mapGoogleToLocal, pendingDeletes, setEvents, setPendingDeletes]);

    const handleEventCreated = async (action: CalendarAction) => {
        const { event } = action.payload as any;

        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const resource: any = {
                summary: event.title,
                description: event.description,
                start: { dateTime: event.startDate, timeZone },
                end: { dateTime: event.endDate, timeZone },
                colorId: eventColorToGoogleColorId[event.color],
            };

            if (event.location) {
                resource.location = event.location;
            }

            if (event.attendees && event.attendees.length > 0) {
                resource.attendees = event.attendees.map(attendee => ({
                    email: attendee.email,
                    displayName: attendee.name,
                    responseStatus: attendee.responseStatus,
                    optional: attendee.optional,
                }));
            }

            if (event.meetingLinkRequested) {
                resource.conferenceData = {
                    createRequest: {
                        requestId: uuid(),
                        conferenceSolutionKey: { type: "hangoutsMeet" },
                    },
                };
            }

            // Add recurrence if present
            if (event.recurrence) {
                resource.recurrence = [toRRuleString(event.recurrence)];
            }

            const response = await withRetry(() => gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource,
                conferenceDataVersion: event.meetingLinkRequested ? 1 : 0,
            }));

            setEvents(prev => prev.map(e =>
                e.id === event.id ? {
                    ...e,
                    googleEventId: response.result.id,
                    meta: { ...e.meta, source: "system" } as any,
                    meetingLink: extractMeetingLink(response.result) ?? e.meetingLink,
                    meetingLinkRequested: false,
                    // Prefer the recurrence from Google's response, fall back to our local copy
                    recurrence: parseRecurrence(response.result.recurrence) ?? e.recurrence,
                } : e
            ));
            console.log("Successfully created Google event", response.result.id);
        } catch (err) {
            console.error("Error creating Google event", err);
        }
    };

    const handleEventUpdated = async (action: CalendarAction) => {
        const { after } = action.payload as any;
        if (!after.googleEventId) return;

        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const resource: any = {
                summary: after.title,
                description: after.description,
                start: { dateTime: after.startDate, timeZone },
                end: { dateTime: after.endDate, timeZone },
                colorId: eventColorToGoogleColorId[after.color],
            };

            if (after.location) {
                resource.location = after.location;
            }

            if (after.attendees && after.attendees.length > 0) {
                resource.attendees = after.attendees.map(attendee => ({
                    email: attendee.email,
                    displayName: attendee.name,
                    responseStatus: attendee.responseStatus,
                    optional: attendee.optional,
                }));
            }

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

    const handleEventDeleted = async (action: CalendarAction) => {
        const { event } = action.payload as any;
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

    // Sync to Google (queue processor)
    useEffect(() => {
        if (!isAuthenticated || actionQueue.length === 0) return;

        const processQueue = async () => {
            const action = actionQueue[0];

            // Skip processing for actions already synced from system or otherwise ignored
            if (action.source === 'system') {
                setActionQueue(prev => prev.slice(1));
                return;
            }

            try {
                switch (action.type) {
                    case 'ADD_EVENT':
                        await handleEventCreated(action);
                        break;
                    case 'UPDATE_EVENT':
                    case 'MOVE_EVENT':
                        await handleEventUpdated(action);
                        break;
                    case 'DELETE_EVENT': {
                        const event = action.payload.event;
                        if (event.googleEventId) {
                            // Mark as pending delete to prevent sync re-adds
                            setPendingDeletes(prev => new Set(prev).add(event.googleEventId!));
                            await handleEventDeleted(action);
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error('Error syncing individual action to Google:', error);
            } finally {
                // Remove the action from the queue after processing (success or failure)
                setActionQueue(prev => prev.slice(1));
            }
        };

        processQueue();
    }, [isAuthenticated, actionQueue, setActionQueue, setPendingDeletes]);

    return null; // Headless component
}
