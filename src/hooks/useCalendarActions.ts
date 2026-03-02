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
import type {
  CalendarAction,
  CalendarEvent,
  CalendarView,
} from "@/types/calendar";
import {
  executeCalendarActionAtom,
  emitCalendarActionEffectAtom,
} from "@/state/calendarEffects";

const nowIso = () => new Date().toISOString();

export function useCalendarActions() {
  const [events, setEvents] = useAtom(eventsAtom);
  const [, setSelectedEventId] = useAtom(selectedEventIdAtom);
  const [history, setHistory] = useAtom(actionHistoryAtom);
  const [redoStack, setRedoStack] = useAtom(redoStackAtom);
  const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom);
  const [view, setView] = useAtom(viewAtom);
  const [, executeAction] = useAtom(executeCalendarActionAtom);
  const [, emitEffect] = useAtom(emitCalendarActionEffectAtom);

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

      setEvents((prev) => [...prev, event]);
      executeAction(action);
    },
    [executeAction, setEvents],
  );

  const updateEvent = useCallback(
    (
      id: string,
      updater: (event: CalendarEvent) => CalendarEvent,
      explanation?: string,
    ) => {
      setEvents((prev) => {
        const existing = prev.find((e) => e.id === id);
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

        executeAction(action);
        return prev.map((e) => (e.id === id ? updated : e));
      });
    },
    [executeAction, setEvents],
  );

  const deleteEvent = useCallback(
    (id: string, explanation?: string) => {
      setEvents((prev) => {
        const existing = prev.find((e) => e.id === id);
        if (!existing) return prev;

        const action: CalendarAction = {
          id: uuid(),
          type: "DELETE_EVENT",
          timestamp: nowIso(),
          source: "user",
          explanation,
          payload: { event: existing },
        };

        executeAction(action);
        return prev.filter((e) => e.id !== id);
      });
      setSelectedEventId((current) => (current === id ? null : current));
    },
    [executeAction, setEvents, setSelectedEventId],
  );

  const moveEvent = useCallback(
    (id: string, newStart: string, newEnd: string, explanation?: string) => {
      setEvents((prev) => {
        const existing = prev.find((e) => e.id === id);
        if (!existing) return prev;
        const after: CalendarEvent = {
          ...existing,
          startDate: newStart,
          endDate: newEnd,
        };

        const action: CalendarAction = {
          id: uuid(),
          type: "MOVE_EVENT",
          timestamp: nowIso(),
          source: after.meta?.source ?? "user",
          explanation,
          payload: { before: existing, after },
        };

        executeAction(action);
        return prev.map((e) => (e.id === id ? after : e));
      });
    },
    [executeAction, setEvents],
  );

  /**
   * Undo the last action.
   *
   * FIX #6: Previously this mutated multiple atoms inside setHistory's updater
   * callback, which is an anti-pattern (stale closures, unpredictable ordering).
   * Now we read the current values first, then make all mutations at the top level.
   */
  const undo = useCallback(() => {
    if (history.length === 0) return;

    const last = history[history.length - 1];

    // Build inverse action for Google sync
    const inverseAction: CalendarAction = (() => {
      switch (last.type) {
        case "ADD_EVENT":
          return {
            id: uuid(),
            type: "DELETE_EVENT" as const,
            timestamp: nowIso(),
            source: "user" as const,
            explanation: "Undo: remove created event",
            payload: { event: last.payload.event },
          };
        case "DELETE_EVENT":
          return {
            id: uuid(),
            type: "ADD_EVENT" as const,
            timestamp: nowIso(),
            source: "user" as const,
            explanation: "Undo: restore deleted event",
            payload: { event: last.payload.event },
          };
        case "UPDATE_EVENT":
        case "MOVE_EVENT":
          return {
            id: uuid(),
            type: "UPDATE_EVENT" as const,
            timestamp: nowIso(),
            source: "user" as const,
            explanation: "Undo: revert event changes",
            payload: { before: last.payload.after, after: last.payload.before },
          };
        default:
          return last;
      }
    })();

    // Apply state changes at the top level (not inside updater callbacks)
    setEvents((prevEvents) => {
      switch (last.type) {
        case "ADD_EVENT":
          return prevEvents.filter((e) => e.id !== last.payload.event.id);
        case "DELETE_EVENT":
          return [...prevEvents, last.payload.event];
        case "UPDATE_EVENT":
        case "MOVE_EVENT":
          return prevEvents.map((e) =>
            e.id === last.payload.after.id ? last.payload.before : e,
          );
        default:
          return prevEvents;
      }
    });

    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
    emitEffect(inverseAction);
  }, [history, emitEffect, setEvents, setHistory, setRedoStack]);

  /**
   * Redo the last undone action.
   * Same fix as undo — all mutations at the top level.
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const last = redoStack[redoStack.length - 1];

    setEvents((prevEvents) => {
      switch (last.type) {
        case "ADD_EVENT":
          return [...prevEvents, last.payload.event];
        case "DELETE_EVENT":
          return prevEvents.filter((e) => e.id !== last.payload.event.id);
        case "UPDATE_EVENT":
        case "MOVE_EVENT":
          return prevEvents.map((e) =>
            e.id === last.payload.before.id ? last.payload.after : e,
          );
        default:
          return prevEvents;
      }
    });

    setHistory((prev) => [...prev, last]);
    setRedoStack((prev) => prev.slice(0, -1));

    emitEffect({
      ...last,
      id: uuid(),
      timestamp: nowIso(),
      source: "user",
      explanation: "Redo: reapply event change",
    });
  }, [redoStack, emitEffect, setEvents, setHistory, setRedoStack]);

  const changeView = useCallback(
    (nextView: CalendarView) => {
      setView(nextView);
    },
    [setView],
  );

  const changeDate = useCallback(
    (date: Date) => {
      setSelectedDate(date);
    },
    [setSelectedDate],
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
