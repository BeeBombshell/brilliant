import { atom } from 'jotai';
import { actionHistoryAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

function ensureUniqueActionTimestamps(actions: CalendarAction[]): CalendarAction[] {
  if (actions.length <= 1) return actions;

  const used = new Set<string>();
  let changed = false;

  const next = actions.map((action) => {
    if (!used.has(action.timestamp)) {
      used.add(action.timestamp);
      return action;
    }

    changed = true;

    const parsed = Date.parse(action.timestamp);
    const baseMs = Number.isNaN(parsed) ? Date.now() : parsed;

    let offset = 1;
    let candidate = new Date(baseMs + offset).toISOString();
    while (used.has(candidate)) {
      offset += 1;
      candidate = new Date(baseMs + offset).toISOString();
    }

    used.add(candidate);
    return { ...action, timestamp: candidate };
  });

  return changed ? next : actions;
}

// Queue atom that components can subscribe to for side effects
export const calendarActionQueueAtom = atom<CalendarAction[]>([]);

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
    const actions = ensureUniqueActionTimestamps(
      Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions]
    );
    set(calendarActionQueueAtom, (prev) => [...prev, ...actions]);
  }
);

