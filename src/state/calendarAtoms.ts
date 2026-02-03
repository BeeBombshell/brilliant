import { atom } from "jotai";
import type {
  CalendarAction,
  CalendarEvent,
  CalendarView,
  NewEventDraft,
} from "@/types/calendar";

export const selectedDateAtom = atom<Date>(new Date());

export const viewAtom = atom<CalendarView>("week");

export const eventsAtom = atom<CalendarEvent[]>([]);

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

