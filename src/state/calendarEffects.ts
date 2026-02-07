import { atom } from 'jotai';
import { actionHistoryAtom, redoStackAtom } from './calendarAtoms';
import type { CalendarAction } from '@/types/calendar';

// Effect atom that components can subscribe to
export const calendarActionEffectAtom = atom<CalendarAction | null>(null);

// Write-only atom that executes actions and triggers effects
export const executeCalendarActionAtom = atom(
  null,
  (_get, set, action: CalendarAction) => {
    // Update history
    set(actionHistoryAtom, (prev) => [...prev, action]);
    set(redoStackAtom, []);

    // Trigger effect for subscribers (like GoogleCalendarSync)
    set(calendarActionEffectAtom, action);

    // Clear effect atom after React render cycle
    setTimeout(() => set(calendarActionEffectAtom, null), 0);
  }
);
