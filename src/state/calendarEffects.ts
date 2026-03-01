import { atom } from 'jotai';
import { actionHistoryAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

// Ensure timestamps are unique within a single execution batch.
// This prevents consumers from accidentally grouping multiple actions together
// due to identical timestamps (e.g. when batching tool-driven actions).
function ensureUniqueActionTimestamps(
  actions: CalendarAction[],
  fallbackBaseMs: number
): CalendarAction[] {
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
    const baseMs = Number.isNaN(parsed) ? fallbackBaseMs : parsed;
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

// Write-only atom that executes actions and triggers effects.
// Note: timestamps may be adjusted to ensure uniqueness within each batch.
export const executeCalendarActionAtom = atom(
  null,
  (_get, set, actionOrActions: CalendarAction | CalendarAction[]) => {
    const actions = ensureUniqueActionTimestamps(
      Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions],
      Date.now()
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

