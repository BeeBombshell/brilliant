export type CalendarView = "day" | "week" | "month";

export type EventColor =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "purple"
  | "orange"
  | "gray";

export interface CalendarEventMeta {
  source: "user" | "ai" | "system";
}

export interface EventPerson {
  name?: string;
  email?: string;
  self?: boolean;
}

export interface EventAttendee extends EventPerson {
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  optional?: boolean;
  organizer?: boolean;
}

export interface RecurrenceRule {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  endDate?: string; // ISO - until when to recur
  count?: number; // number of occurrences
  interval?: number; // e.g., every 2 weeks (default 1)
  byDay?: string[]; // e.g., ["MO", "WE", "FR"] for weekly
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  meetingLink?: string;
  meetingLinkRequested?: boolean;
  location?: string;
  startDate: string; // ISO
  endDate: string; // ISO
  color: EventColor;
  meta?: CalendarEventMeta;
  googleEventId?: string;
  organizer?: EventPerson;
  creator?: EventPerson;
  attendees?: EventAttendee[];
  recurrence?: RecurrenceRule; // For recurring events
  recurringEventId?: string; // Parent recurring event ID (for instances)
  isInstance?: boolean; // True if this is an instance of a recurring event
}

export type NewEventDraft = {
  startDate: string;
  endDate: string;
};

export type CalendarActionType =
  | "ADD_EVENT"
  | "UPDATE_EVENT"
  | "DELETE_EVENT"
  | "MOVE_EVENT";

export interface BaseCalendarAction {
  id: string;
  type: CalendarActionType;
  timestamp: string;
  source: "user" | "ai" | "system";
  explanation?: string;
}

export interface AddEventAction extends BaseCalendarAction {
  type: "ADD_EVENT";
  payload: { event: CalendarEvent };
}

export interface UpdateEventAction extends BaseCalendarAction {
  type: "UPDATE_EVENT";
  payload: { before: CalendarEvent; after: CalendarEvent };
}

export interface DeleteEventAction extends BaseCalendarAction {
  type: "DELETE_EVENT";
  payload: { event: CalendarEvent };
}

export interface MoveEventAction extends BaseCalendarAction {
  type: "MOVE_EVENT";
  payload: { before: CalendarEvent; after: CalendarEvent };
}

export type CalendarAction =
  | AddEventAction
  | UpdateEventAction
  | DeleteEventAction
  | MoveEventAction;

export type CalendarEventType =
  | "event.created"
  | "event.updated"
  | "event.deleted"
  | "event.moved"
  | "history.undone"
  | "history.redone"
  | "view.changed"
  | "date.changed";

export type MultiDayPosition = "first" | "middle" | "last" | "none";

export interface EventGroup {
  events: CalendarEvent[];
  columns: EventColumn[];
}

export interface EventColumn {
  event: CalendarEvent;
  left: number;    // percentage
  width: number;   // percentage
  zIndex: number;
}

export interface EventSlot {
  event: CalendarEvent;
  slot: number;     // 0, 1, or 2 for month view
  position: MultiDayPosition;
}

export interface BlockStyle {
  top: string;
  left: string;
  width: string;
  height: string;
  zIndex: number;
}

