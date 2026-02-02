import { atom } from "jotai";
import type {
  CalendarAction,
  CalendarEvent,
  CalendarView,
  NewEventDraft,
} from "@/types/calendar";

export const selectedDateAtom = atom<Date>(new Date());

export const viewAtom = atom<CalendarView>("week");

const mockNow = new Date();
const toIso = (d: Date) => d.toISOString();

const createMockEvents = (): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  let eventId = 1;

  // Helper to create date at specific day offset and time
  const createDate = (dayOffset: number, hour: number, minute: number = 0) => {
    return new Date(
      mockNow.getFullYear(),
      mockNow.getMonth(),
      mockNow.getDate() + dayOffset,
      hour,
      minute,
      0
    );
  };

  // Today's events
  events.push(
    {
      id: String(eventId++),
      title: "Morning Standup",
      description: "Daily team sync and planning session",
      startDate: toIso(createDate(0, 9, 0)),
      endDate: toIso(createDate(0, 9, 30)),
      color: "blue",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Deep Work Block",
      description: "Focus time for critical project milestones",
      startDate: toIso(createDate(0, 10, 0)),
      endDate: toIso(createDate(0, 12, 0)),
      color: "purple",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Lunch & Learn",
      description: "New technology presentation",
      startDate: toIso(createDate(0, 12, 30)),
      endDate: toIso(createDate(0, 13, 30)),
      color: "green",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Client Call",
      description: "Q4 strategy review with stakeholders",
      startDate: toIso(createDate(0, 14, 0)),
      endDate: toIso(createDate(0, 15, 0)),
      color: "orange",
      meta: { source: "ai" },
    },
    {
      id: String(eventId++),
      title: "Code Review",
      description: "Review PRs and provide feedback",
      startDate: toIso(createDate(0, 15, 30)),
      endDate: toIso(createDate(0, 16, 30)),
      color: "blue",
      meta: { source: "user" },
    }
  );

  // Tomorrow's events
  events.push(
    {
      id: String(eventId++),
      title: "Planning Session",
      description: "Sprint planning for next iteration",
      startDate: toIso(createDate(1, 9, 0)),
      endDate: toIso(createDate(1, 10, 30)),
      color: "yellow",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Design Review",
      description: "UI/UX feedback session",
      startDate: toIso(createDate(1, 11, 0)),
      endDate: toIso(createDate(1, 12, 0)),
      color: "purple",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "1:1 with Manager",
      description: "Quarterly performance discussion",
      startDate: toIso(createDate(1, 14, 0)),
      endDate: toIso(createDate(1, 14, 45)),
      color: "green",
      meta: { source: "ai" },
    },
    {
      id: String(eventId++),
      title: "Workshop",
      description: "Advanced React patterns workshop",
      startDate: toIso(createDate(1, 15, 0)),
      endDate: toIso(createDate(1, 17, 0)),
      color: "blue",
      meta: { source: "user" },
    }
  );

  // Day after tomorrow
  events.push(
    {
      id: String(eventId++),
      title: "Team Building",
      description: "Quarterly team offsite activity",
      startDate: toIso(createDate(2, 10, 0)),
      endDate: toIso(createDate(2, 12, 0)),
      color: "green",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Budget Review",
      description: "Q4 financial planning meeting",
      startDate: toIso(createDate(2, 13, 0)),
      endDate: toIso(createDate(2, 14, 0)),
      color: "orange",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Documentation",
      description: "Update API documentation",
      startDate: toIso(createDate(2, 15, 0)),
      endDate: toIso(createDate(2, 17, 0)),
      color: "gray",
      meta: { source: "user" },
    }
  );

  // Future events (next week)
  events.push(
    {
      id: String(eventId++),
      title: "Product Demo",
      description: "Showcase new features to leadership",
      startDate: toIso(createDate(3, 10, 0)),
      endDate: toIso(createDate(3, 11, 30)),
      color: "red",
      meta: { source: "ai" },
    },
    {
      id: String(eventId++),
      title: "Security Audit",
      description: "Quarterly security review",
      startDate: toIso(createDate(4, 9, 0)),
      endDate: toIso(createDate(4, 11, 0)),
      color: "red",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "All Hands",
      description: "Company-wide quarterly update",
      startDate: toIso(createDate(5, 14, 0)),
      endDate: toIso(createDate(5, 15, 30)),
      color: "blue",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Engineering Retro",
      description: "Reflect on sprint outcomes",
      startDate: toIso(createDate(6, 16, 0)),
      endDate: toIso(createDate(6, 17, 0)),
      color: "purple",
      meta: { source: "user" },
    }
  );

  // Previous week events
  events.push(
    {
      id: String(eventId++),
      title: "Kickoff Meeting",
      description: "New project initialization",
      startDate: toIso(createDate(-3, 10, 0)),
      endDate: toIso(createDate(-3, 11, 0)),
      color: "green",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Training Session",
      description: "Internal tools training",
      startDate: toIso(createDate(-2, 14, 0)),
      endDate: toIso(createDate(-2, 16, 0)),
      color: "yellow",
      meta: { source: "user" },
    },
    {
      id: String(eventId++),
      title: "Architecture Review",
      description: "System design discussion",
      startDate: toIso(createDate(-1, 11, 0)),
      endDate: toIso(createDate(-1, 12, 30)),
      color: "purple",
      meta: { source: "user" },
    }
  );

  return events;
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

export const newEventDraftAtom = atom<NewEventDraft | null>(null);

