import { atom } from "jotai";
import type { CalendarAction, CalendarEvent, CalendarView } from "@/types/calendar";

export const selectedDateAtom = atom<Date>(new Date());

export const viewAtom = atom<CalendarView>("week");

const mockNow = new Date();
const toIso = (d: Date) => d.toISOString();

const createMockEvents = (): CalendarEvent[] => {
  const dayStart = new Date(
    mockNow.getFullYear(),
    mockNow.getMonth(),
    mockNow.getDate(),
    9,
    0,
    0
  );
  const dayMid = new Date(
    mockNow.getFullYear(),
    mockNow.getMonth(),
    mockNow.getDate(),
    13,
    0,
    0
  );
  const dayEnd = new Date(
    mockNow.getFullYear(),
    mockNow.getMonth(),
    mockNow.getDate(),
    17,
    0,
    0
  );

  return [
    {
      id: "1",
      title: "Deep Work",
      description: "Focus block for core project work",
      startDate: toIso(dayStart),
      endDate: toIso(new Date(dayStart.getTime() + 2 * 60 * 60 * 1000)),
      color: "blue",
      meta: { source: "user" },
    },
    {
      id: "2",
      title: "Product Sync",
      description: "Sync with team",
      startDate: toIso(dayMid),
      endDate: toIso(new Date(dayMid.getTime() + 60 * 60 * 1000)),
      color: "green",
      meta: { source: "ai" },
    },
    {
      id: "3",
      title: "Evening Review",
      description: "Review outcomes & plan tomorrow",
      startDate: toIso(new Date(dayEnd.getTime() - 60 * 60 * 1000)),
      endDate: toIso(dayEnd),
      color: "purple",
      meta: { source: "user" },
    },
  ];
};

export const eventsAtom = atom<CalendarEvent[]>(createMockEvents());

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

