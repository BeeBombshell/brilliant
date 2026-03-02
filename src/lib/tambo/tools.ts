import { getDefaultStore } from "jotai";
import { v4 as uuid } from "uuid";
import { defineTool } from "@tambo-ai/react";
import { eventsAtom } from "@/state/calendarAtoms";
import { executeCalendarActionAtom } from "@/state/calendarEffects";
import type {
  CalendarEvent,
  CalendarAction,
  EventColor,
  RecurrenceRule,
} from "@/types/calendar";
import { expandAllRecurringEvents } from "@/lib/dateUtils";

import {
  CreateEventSchema,
  CreateEventOutputSchema,
  GetEventsSchema,
  GetEventsOutputSchema,
  UpdateEventSchema,
  UpdateEventOutputSchema,
  DeleteEventSchema,
  DeleteEventOutputSchema,
  BatchCalendarSchema,
  ReorganizeOutputSchema,
} from "./schemas";

// --- Shared helpers ---

/**
 * Build a CalendarEvent from AI-provided fields.
 * Single source of truth for event creation (used by tools and reorganize).
 */
function buildCalendarEvent(fields: {
  summary: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
  color?: string;
  meetingLinkRequested?: boolean;
  recurrence?: RecurrenceRule;
}): CalendarEvent {
  return {
    id: uuid(),
    title: fields.summary,
    startDate: fields.startDateTime,
    endDate: fields.endDateTime,
    description: fields.description,
    location: fields.location,
    attendees: fields.attendees?.map((email) => ({ email })),
    color: (fields.color as EventColor) ?? "blue",
    meetingLinkRequested: fields.meetingLinkRequested,
    meta: { source: "ai" },
    recurrence: fields.recurrence,
  };
}

/**
 * Apply a CalendarAction atomically — updates events AND pushes to action
 * history + sync queue in a single call. This fixes the dual-mutation race
 * condition where events and history could get out of sync.
 */
function applyAction(
  store: ReturnType<typeof getDefaultStore>,
  action: CalendarAction,
  eventsMutator: (prev: CalendarEvent[]) => CalendarEvent[],
) {
  store.set(eventsAtom, eventsMutator);
  store.set(executeCalendarActionAtom, action);
}

function applyActions(
  store: ReturnType<typeof getDefaultStore>,
  actions: CalendarAction[],
  nextEvents: CalendarEvent[],
) {
  store.set(eventsAtom, nextEvents);
  store.set(executeCalendarActionAtom, actions);
}

/** Resolve an event ID that may be an instance ID (e.g. `eventId_2024-03-01`) to its master. */
function resolveMasterId(id: string): string {
  return id.includes("_") ? id.split("_")[0] : id;
}

/** Defensive: ensure ISO string includes time portion. */
function ensureDateTime(dateStr: string, fallbackTime: string): Date {
  if (!dateStr.includes("T")) {
    return new Date(`${dateStr}T${fallbackTime}`);
  }
  return new Date(dateStr);
}

// --- Tool definitions ---

const createCalendarEvent = defineTool({
  name: "createCalendarEvent",
  description:
    "Create a single new event. For multiple creates/updates/deletes, use batchCalendarUpdate instead.",
  inputSchema: CreateEventSchema,
  outputSchema: CreateEventOutputSchema,
  tool: async ({
    summary,
    startDateTime,
    endDateTime,
    description,
    location,
    attendees,
    color,
    meetingLinkRequested,
    recurrence,
  }) => {
    const store = getDefaultStore();
    const event = buildCalendarEvent({
      summary,
      startDateTime,
      endDateTime,
      description,
      location,
      attendees,
      color,
      meetingLinkRequested,
      recurrence: recurrence as RecurrenceRule | undefined,
    });

    const action: CalendarAction = {
      id: uuid(),
      type: "ADD_EVENT",
      timestamp: new Date().toISOString(),
      source: "ai",
      payload: { event },
    };

    applyAction(store, action, (prev) => [...prev, event]);

    const recurrenceInfo = recurrence
      ? ` (recurring ${recurrence.frequency.toLowerCase()}${recurrence.count ? ` for ${recurrence.count} times` : ""})`
      : "";

    return {
      success: true,
      message: `Created event "${summary}"${recurrenceInfo}`,
      eventId: event.id,
    };
  },
});

const getCalendarEvents = defineTool({
  name: "getCalendarEvents",
  description:
    "Retrieve events from the user's calendar for a specific time range",
  inputSchema: GetEventsSchema,
  outputSchema: GetEventsOutputSchema,
  tool: async ({ startDate, endDate }) => {
    const store = getDefaultStore();
    const allEvents = store.get(eventsAtom);

    const start = ensureDateTime(startDate, "00:00:00");
    const end = ensureDateTime(endDate, "23:59:59");

    const expandedEvents = expandAllRecurringEvents(allEvents, start, end);

    const filtered = expandedEvents.filter((e) => {
      const eStart = new Date(e.startDate);
      const eEnd = new Date(e.endDate);
      return eStart < end && eEnd > start;
    });

    const eventList = filtered
      .map(
        (e) =>
          `${e.title} [${new Date(e.startDate).getHours()}:${String(new Date(e.startDate).getMinutes()).padStart(2, "0")}]`,
      )
      .join(", ");

    return {
      success: true,
      events: filtered,
      message:
        filtered.length > 0
          ? `Found ${filtered.length} events: ${eventList}`
          : `No events found between ${start.toLocaleString()} and ${end.toLocaleString()}.`,
    };
  },
});

const updateCalendarEvent = defineTool({
  name: "updateCalendarEvent",
  description:
    "Update a single existing event. For multiple changes, use batchCalendarUpdate instead.",
  inputSchema: UpdateEventSchema,
  outputSchema: UpdateEventOutputSchema,
  tool: async (patch) => {
    const store = getDefaultStore();
    const allEvents = store.get(eventsAtom);
    const masterId = resolveMasterId(patch.id);
    const existing = allEvents.find((e) => e.id === masterId);

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
      attendees: patch.attendees
        ? patch.attendees.map((email) => ({ email }))
        : existing.attendees,
      color: (patch.color as EventColor) ?? existing.color,
      meetingLinkRequested:
        patch.meetingLinkRequested ?? existing.meetingLinkRequested,
      recurrence: patch.recurrence
        ? (patch.recurrence as RecurrenceRule)
        : existing.recurrence,
      meta: { source: "ai" },
    };

    const action: CalendarAction = {
      id: uuid(),
      type: "UPDATE_EVENT",
      timestamp: new Date().toISOString(),
      source: "ai",
      payload: { before: existing, after: updated },
    };

    applyAction(store, action, (prev) =>
      prev.map((e) => (e.id === masterId ? updated : e)),
    );

    return {
      success: true,
      message: `Updated event "${updated.title}"`,
    };
  },
});

const deleteCalendarEvent = defineTool({
  name: "deleteCalendarEvent",
  description:
    "Delete a single event. For multiple changes, use batchCalendarUpdate instead.",
  inputSchema: DeleteEventSchema,
  outputSchema: DeleteEventOutputSchema,
  tool: async ({ id }) => {
    const store = getDefaultStore();
    const allEvents = store.get(eventsAtom);
    const masterId = resolveMasterId(id);
    const existing = allEvents.find((e) => e.id === masterId);

    if (!existing) {
      return { success: false, message: `Event with ID ${id} not found` };
    }

    const action: CalendarAction = {
      id: uuid(),
      type: "DELETE_EVENT",
      timestamp: new Date().toISOString(),
      source: "ai",
      payload: { event: existing },
    };

    applyAction(store, action, (prev) => prev.filter((e) => e.id !== masterId));

    return {
      success: true,
      message: `Deleted event "${existing.title}"`,
    };
  },
});

const batchCalendarUpdate = defineTool({
  name: "batchCalendarUpdate",
  description:
    "PREFERRED tool when the user's request involves 2 or more changes. " +
    "Pass all operations as a JSON array string. " +
    "Always use this instead of calling individual tools multiple times.",
  inputSchema: BatchCalendarSchema,
  outputSchema: ReorganizeOutputSchema,
  tool: async ({ operations, explanation }) => {
    // Parse the JSON string
    let ops: Array<Record<string, unknown>>;
    try {
      ops = JSON.parse(operations);
    } catch {
      return {
        success: false,
        message: "Invalid JSON in operations string.",
        actionCount: 0,
      };
    }

    if (!Array.isArray(ops) || ops.length === 0) {
      return {
        success: false,
        message: "operations must be a non-empty JSON array.",
        actionCount: 0,
      };
    }

    const store = getDefaultStore();
    const timestamp = new Date().toISOString();
    const calendarActions: CalendarAction[] = [];
    let nextEvents = [...store.get(eventsAtom)];

    for (const entry of ops) {
      if (!entry || typeof entry !== "object") continue;
      const op = entry.op as string;

      if (op === "create") {
        const title = entry.title as string;
        const startDate = entry.startDate as string;
        const endDate = entry.endDate as string;
        if (!title || !startDate || !endDate) continue;

        const event = buildCalendarEvent({
          summary: title,
          startDateTime: startDate,
          endDateTime: endDate,
          description: entry.description as string | undefined,
          color: entry.color as string | undefined,
          location: entry.location as string | undefined,
        });
        calendarActions.push({
          id: uuid(),
          type: "ADD_EVENT",
          timestamp,
          source: "ai",
          explanation,
          payload: { event },
        });
        nextEvents.push(event);
      } else if (op === "update") {
        const id = entry.id as string;
        if (!id) continue;

        const masterId = resolveMasterId(id);
        const existing = nextEvents.find((e) => e.id === masterId);
        if (!existing) continue;

        const updated: CalendarEvent = {
          ...existing,
          title: (entry.title as string) ?? existing.title,
          startDate: (entry.startDate as string) ?? existing.startDate,
          endDate: (entry.endDate as string) ?? existing.endDate,
          description: (entry.description as string) ?? existing.description,
          location: (entry.location as string) ?? existing.location,
          color: (entry.color as EventColor) ?? existing.color,
          attendees: existing.attendees,
          meetingLinkRequested: existing.meetingLinkRequested,
          recurrence: existing.recurrence,
          meta: { source: "ai" },
        };
        calendarActions.push({
          id: uuid(),
          type: "UPDATE_EVENT",
          timestamp,
          source: "ai",
          explanation,
          payload: { before: existing, after: updated },
        });
        nextEvents = nextEvents.map((e) => (e.id === masterId ? updated : e));
      } else if (op === "delete") {
        const id = entry.id as string;
        if (!id) continue;

        const masterId = resolveMasterId(id);
        const existing = nextEvents.find((e) => e.id === masterId);
        if (!existing) continue;

        calendarActions.push({
          id: uuid(),
          type: "DELETE_EVENT",
          timestamp,
          source: "ai",
          explanation,
          payload: { event: existing },
        });
        nextEvents = nextEvents.filter((e) => e.id !== masterId);
      }
    }

    if (calendarActions.length === 0) {
      return {
        success: false,
        message: "No valid operations found. Check JSON format and event IDs.",
        actionCount: 0,
      };
    }

    applyActions(store, calendarActions, nextEvents);

    return {
      success: true,
      message: `Applied ${calendarActions.length} changes.`,
      actionCount: calendarActions.length,
    };
  },
});

export const tamboTools = [
  createCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  batchCalendarUpdate,
];
