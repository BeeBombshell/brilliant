import { useCallback } from "react";
import { useAtom } from "jotai";
import { v4 as uuid } from "uuid";

import {
  actionHistoryAtom,
  eventsAtom,
  redoStackAtom,
  selectedEventIdAtom,
  selectedDateAtom,
  viewAtom,
} from "@/state/calendarAtoms";
import type { CalendarAction, CalendarEvent, CalendarView } from "@/types/calendar";
import { eventBus } from "@/lib/eventBus";

const nowIso = () => new Date().toISOString();

export function useCalendarActions() {
  const [events, setEvents] = useAtom(eventsAtom);
  const [, setSelectedEventId] = useAtom(selectedEventIdAtom);
  const [history, setHistory] = useAtom(actionHistoryAtom);
  const [redoStack, setRedoStack] = useAtom(redoStackAtom);
  const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom);
  const [view, setView] = useAtom(viewAtom);

  const commitAction = useCallback(
    (action: CalendarAction, eventType: "event.created" | "event.updated" | "event.deleted" | "event.moved") => {
      setHistory(prev => [...prev, action]);
      setRedoStack([]);
      eventBus.emit({ type: eventType, action });
    },
    [setHistory, setRedoStack]
  );

  const addEvent = useCallback(
    (partial: Omit<CalendarEvent, "id">) => {
      const event: CalendarEvent = { ...partial, id: uuid() };
      const action: CalendarAction = {
        id: uuid(),
        type: "ADD_EVENT",
        timestamp: nowIso(),
        source: partial.meta?.source ?? "user",
        payload: { event },
      };

      setEvents(prev => [...prev, event]);
      commitAction(action, "event.created");
    },
    [commitAction, setEvents, setSelectedEventId]
  );

  const updateEvent = useCallback(
    (id: string, updater: (event: CalendarEvent) => CalendarEvent, explanation?: string) => {
      setEvents(prev => {
        const existing = prev.find(e => e.id === id);
        if (!existing) return prev;
        const updated = updater(existing);

        const action: CalendarAction = {
          id: uuid(),
          type: "UPDATE_EVENT",
          timestamp: nowIso(),
          source: updated.meta?.source ?? "user",
          explanation,
          payload: { before: existing, after: updated },
        };

        commitAction(action, "event.updated");
        return prev.map(e => (e.id === id ? updated : e));
      });
    },
    [commitAction, setEvents]
  );

  const deleteEvent = useCallback(
    (id: string, explanation?: string) => {
      setEvents(prev => {
        const existing = prev.find(e => e.id === id);
        if (!existing) return prev;

        const action: CalendarAction = {
          id: uuid(),
          type: "DELETE_EVENT",
          timestamp: nowIso(),
          source: existing.meta?.source ?? "user",
          explanation,
          payload: { event: existing },
        };

        commitAction(action, "event.deleted");
        return prev.filter(e => e.id !== id);
      });
      setSelectedEventId(current => (current === id ? null : current));
    },
    [commitAction, setEvents, setSelectedEventId]
  );

  const moveEvent = useCallback(
    (id: string, newStart: string, newEnd: string, explanation?: string) => {
      setEvents(prev => {
        const existing = prev.find(e => e.id === id);
        if (!existing) return prev;
        const after: CalendarEvent = { ...existing, startDate: newStart, endDate: newEnd };

        const action: CalendarAction = {
          id: uuid(),
          type: "MOVE_EVENT",
          timestamp: nowIso(),
          source: after.meta?.source ?? "user",
          explanation,
          payload: { before: existing, after },
        };

        commitAction(action, "event.moved");
        return prev.map(e => (e.id === id ? after : e));
      });
    },
    [commitAction, setEvents]
  );

  const undo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const last = prevHistory[prevHistory.length - 1];

      setEvents(prevEvents => {
        switch (last.type) {
          case "ADD_EVENT":
            return prevEvents.filter(e => e.id !== last.payload.event.id);
          case "DELETE_EVENT":
            return [...prevEvents, last.payload.event];
          case "UPDATE_EVENT":
          case "MOVE_EVENT":
            return prevEvents.map(e =>
              e.id === last.payload.after.id ? last.payload.before : e
            );
          default:
            return prevEvents;
        }
      });

      setRedoStack(prevRedo => [...prevRedo, last]);
      eventBus.emit({ type: "history.undone", action: last });

      return prevHistory.slice(0, -1);
    });
  }, [setEvents, setHistory, setRedoStack]);

  const redo = useCallback(() => {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const last = prevRedo[prevRedo.length - 1];

      setEvents(prevEvents => {
        switch (last.type) {
          case "ADD_EVENT":
            return [...prevEvents, last.payload.event];
          case "DELETE_EVENT":
            return prevEvents.filter(e => e.id !== last.payload.event.id);
          case "UPDATE_EVENT":
          case "MOVE_EVENT":
            return prevEvents.map(e =>
              e.id === last.payload.before.id ? last.payload.after : e
            );
          default:
            return prevEvents;
        }
      });

      setHistory(prevHistory => [...prevHistory, last]);
      eventBus.emit({ type: "history.redone", action: last });

      return prevRedo.slice(0, -1);
    });
  }, [setEvents, setHistory, setRedoStack]);

  const changeView = useCallback(
    (nextView: CalendarView) => {
      setView(nextView);
      eventBus.emit({ type: "view.changed", view: nextView });
    },
    [setView]
  );

  const changeDate = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      eventBus.emit({ type: "date.changed", date });
    },
    [setSelectedDate]
  );

  return {
    events,
    history,
    redoStack,
    view,
    selectedDate,
    setSelectedEventId,
    addEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    undo,
    redo,
    changeView,
    changeDate,
  };
}

