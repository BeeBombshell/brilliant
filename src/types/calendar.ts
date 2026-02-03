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

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO
  endDate: string; // ISO
  color: EventColor;
  meta?: CalendarEventMeta;
  googleEventId?: string;
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

