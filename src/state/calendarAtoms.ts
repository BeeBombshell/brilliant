import { atom } from "jotai";
import {
  startOfMonth,
  endOfMonth,
  addDays,
} from "date-fns";
import type {
  CalendarAction,
  CalendarEvent,
  CalendarView,
  NewEventDraft,
} from "@/types/calendar";
import { expandAllRecurringEvents } from "@/lib/dateUtils";

export const selectedDateAtom = atom<Date>(new Date());

export const viewAtom = atom<CalendarView>("week");

export const eventsAtom = atom<CalendarEvent[]>([]);

/**
 * Derived read-only atom that expands recurring events into concrete instances
 * for the currently visible date range (based on selectedDate and view).
 * All calendar views should use this instead of eventsAtom directly.
 */
export const expandedEventsAtom = atom<CalendarEvent[]>((get) => {
  const events = get(eventsAtom);
  const selectedDate = get(selectedDateAtom);
  const view = get(viewAtom);

  // Calculate visible range based on the current view, with generous padding
  let rangeStart: Date;
  let rangeEnd: Date;

  switch (view) {
    case "day":
      rangeStart = addDays(selectedDate, -1);
      rangeEnd = addDays(selectedDate, 1);
      break;
    case "week":
      rangeStart = addDays(selectedDate, -7);
      rangeEnd = addDays(selectedDate, 7);
      break;
    case "month":
    default:
      rangeStart = addDays(startOfMonth(selectedDate), -7);
      rangeEnd = addDays(endOfMonth(selectedDate), 7);
      break;
  }

  return expandAllRecurringEvents(events, rangeStart, rangeEnd);
});

export const selectedEventIdAtom = atom<string | null>(null);

export const actionHistoryAtom = atom<CalendarAction[]>([]);

export const redoStackAtom = atom<CalendarAction[]>([]);

export const actionLogAtom = atom<string[]>(get =>
  get(actionHistoryAtom)
    .slice(-5)
    .map(action => {
      const time = new Date(action.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (action.explanation) {
        return `[${time}] ${action.explanation}`;
      }

      switch (action.type) {
        case "ADD_EVENT":
          return `[${time}] Added “${action.payload.event.title}”.`;
        case "UPDATE_EVENT":
          return `[${time}] Updated “${action.payload.after.title}”.`;
        case "DELETE_EVENT":
          return `[${time}] Deleted “${action.payload.event.title}”.`;
        case "MOVE_EVENT":
          return `[${time}] Moved “${action.payload.after.title}”.`;
        default:
          return `[${time}] Performed calendar change.`;
      }
    })
);

export const newEventDraftAtom = atom<NewEventDraft | null>(null);

export interface MultiDayDragState {
  type: "create" | "move";
  startDate: Date;
  endDate: Date;
  eventId?: string;
  originalEvent?: CalendarEvent;
}

export const multiDayDragAtom = atom<MultiDayDragState | null>(null);

// --- Chat & Revert State ---

export const chatThreadIdAtom = atom<string | null>(null);

export interface Checkpoint {
  messageId: string;
  historyIndex: number;
  eventIds: string[]; // Store IDs of events touched by this message
}

export const checkpointsAtom = atom<Checkpoint[]>([]);

export interface ThreadHistoryEntry {
  id: string;
  title: string;
  timestamp: string;
}

export const threadsHistoryAtom = atom<ThreadHistoryEntry[]>([]);

