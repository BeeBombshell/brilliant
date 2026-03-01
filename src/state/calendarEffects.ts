import { atom } from 'jotai';
import { actionHistoryAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

function ensureUniqueActionTimestamps(actions: CalendarAction[]): CalendarAction[] {
  if (actions.length <= 1) return actions;

  const seen = new Set<string>();
  const hasDuplicate = actions.some((a) => {
    if (seen.has(a.timestamp)) return true;
    seen.add(a.timestamp);
    return false;
  });

  if (!hasDuplicate) return actions;

  const baseMs = Number.isNaN(Date.parse(actions[0].timestamp))
    ? Date.now()
    : Date.parse(actions[0].timestamp);

  return actions.map((a, idx) => ({
    ...a,
    timestamp: new Date(baseMs + idx).toISOString(),
  }));
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

