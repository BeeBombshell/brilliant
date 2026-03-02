import { atom } from 'jotai';
import { actionHistoryAtom, pendingDeletesAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

function ensureUniqueActionTimestamps(actions: CalendarAction[]): CalendarAction[] {
  if (actions.length <= 1) return actions;

  const used = new Set<string>();
  const nextMsByOriginalTimestamp = new Map<string, number>();
  let changed = false;

  const next = actions.map((action) => {
    if (!used.has(action.timestamp)) {
      used.add(action.timestamp);
      return action;
    }

    changed = true;

    const parsed = Date.parse(action.timestamp);
    const baseMs = Number.isNaN(parsed) ? Date.now() : parsed;
    let nextMs = nextMsByOriginalTimestamp.get(action.timestamp) ?? baseMs + 1;

    let candidate = new Date(nextMs).toISOString();
    while (used.has(candidate)) {
      nextMs += 1;
      candidate = new Date(nextMs).toISOString();
    }

    nextMsByOriginalTimestamp.set(action.timestamp, nextMs + 1);

    used.add(candidate);
    return { ...action, timestamp: candidate };
  });

  return changed ? next : actions;
}

// Queue atom that components can subscribe to for side effects
export const calendarActionQueueAtom = atom<CalendarAction[]>([]);

function propagateGoogleEventIdToQueue(
  queue: CalendarAction[],
  params: { localEventId: string; googleEventId: string }
): { queue: CalendarAction[]; hasPendingDelete: boolean; changed: boolean } {
  let changed = false;
  let hasPendingDelete = false;

  const nextQueue = queue.map((a) => {
    if (a.type === 'DELETE_EVENT' && a.payload.event.id === params.localEventId) {
      hasPendingDelete = true;
      changed = true;
      return {
        ...a,
        payload: {
          ...a.payload,
          event: { ...a.payload.event, googleEventId: params.googleEventId },
        },
      };
    }

    if (
      (a.type === 'UPDATE_EVENT' || a.type === 'MOVE_EVENT') &&
      a.payload.before.id === params.localEventId
    ) {
      changed = true;
      return {
        ...a,
        payload: {
          ...a.payload,
          before: { ...a.payload.before, googleEventId: params.googleEventId },
          after: { ...a.payload.after, googleEventId: params.googleEventId },
        },
      };
    }

    return a;
  });

  return { queue: changed ? nextQueue : queue, hasPendingDelete, changed };
}

export const propagateGoogleEventIdToQueueAtom = atom(
  null,
  (get, set, params: { localEventId: string; googleEventId: string }) => {
    const prevQueue = get(calendarActionQueueAtom);
    const { queue: nextQueue, hasPendingDelete, changed } = propagateGoogleEventIdToQueue(prevQueue, params);

    if (changed) {
      set(calendarActionQueueAtom, nextQueue);
    }

    if (hasPendingDelete) {
      set(pendingDeletesAtom, (prev) =>
        prev.includes(params.googleEventId) ? prev : [...prev, params.googleEventId]
      );
    }
  }
);

// Write-only atom that executes actions and triggers effects
export const executeCalendarActionAtom = atom(
  null,
  (_get, set, actionOrActions: CalendarAction | CalendarAction[]) => {
    const actions = ensureUniqueActionTimestamps(
      Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions]
    );

    // Update history
    set(actionHistoryAtom, (prev) => [...prev, ...actions]);
    set(redoStackAtom, []);

    // Push to queue for side effects (like Google Calendar sync)
    set(calendarActionQueueAtom, (prev) => [...prev, ...actions]);
  }
);

// Write-only atom that only emits effects (no history changes)
export const emitCalendarActionEffectAtom = atom(
  null,
  (_get, set, actionOrActions: CalendarAction | CalendarAction[]) => {
    const actions = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions];
    set(calendarActionQueueAtom, (prev) => [...prev, ...actions]);
  }
);

