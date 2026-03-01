import { atom } from 'jotai';
import { actionHistoryAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

// Queue atom that components can subscribe to for side effects
export const calendarActionQueueAtom = atom<CalendarAction[]>([]);

// Write-only atom that executes actions and triggers effects
export const executeCalendarActionAtom = atom(
  null,
  (_get, set, actionOrActions: CalendarAction | CalendarAction[]) => {
    const actions = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions];

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

