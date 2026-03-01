import { atom } from 'jotai';
import { actionHistoryAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

// Ensure timestamps are unique within a single execution batch (not globally across history).
// This prevents consumers from accidentally grouping multiple actions together
// due to identical timestamps (e.g. when batching tool-driven actions).
function ensureUniqueActionTimestamps(actions: CalendarAction[]): CalendarAction[] {
  if (actions.length <= 1) return actions;

  const used = new Set<string>();
  const nextMsByOriginalTimestamp = new Map<string, number>();
  const invalidTimestampCounters = new Map<string, number>();
  let changed = false;

  const next = actions.map((action) => {
    if (!used.has(action.timestamp)) {
      used.add(action.timestamp);
      return action;
    }

    changed = true;

    const parsed = Date.parse(action.timestamp);
    if (Number.isNaN(parsed)) {
      changed = true;

      let counter = (invalidTimestampCounters.get(action.timestamp) ?? 0) + 1;
      let candidate = `${action.timestamp}#${counter}`;
      while (used.has(candidate)) {
        counter += 1;
        candidate = `${action.timestamp}#${counter}`;
      }

      invalidTimestampCounters.set(action.timestamp, counter);
      used.add(candidate);
      return { ...action, timestamp: candidate };
    }

    const baseMs = parsed;
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

