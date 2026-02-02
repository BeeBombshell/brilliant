import type { CalendarAction, CalendarEventType } from "@/types/calendar";

type EventPayload =
  | { type: "event.created"; action: CalendarAction }
  | { type: "event.updated"; action: CalendarAction }
  | { type: "event.deleted"; action: CalendarAction }
  | { type: "event.moved"; action: CalendarAction }
  | { type: "history.undone"; action: CalendarAction }
  | { type: "history.redone"; action: CalendarAction }
  | { type: "view.changed"; view: string }
  | { type: "date.changed"; date: Date };

type Listener = (payload: EventPayload) => void;

class EventBus {
  private listeners = new Map<CalendarEventType, Set<Listener>>();

  subscribe(type: CalendarEventType, listener: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.unsubscribe(type, listener);
  }

  unsubscribe(type: CalendarEventType, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(payload: EventPayload) {
    const listeners = this.listeners.get(payload.type);
    if (!listeners) return;
    listeners.forEach(listener => listener(payload));
  }
}

export const eventBus = new EventBus();

