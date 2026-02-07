import { parseISO } from 'date-fns';
import type { EventColor } from '@/types/calendar';

export const dateTimeHelpers = {
  toLocalInputValue(iso: string): string {
    const date = parseISO(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  },

  fromLocalInputValue(value: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  },

  ensureValidTimeRange(start: Date, end: Date): { start: Date; end: Date } {
    if (end <= start) {
      return { start, end: new Date(start.getTime() + 30 * 60000) };
    }
    return { start, end };
  }
};

export const eventColorConfig: Record<EventColor, { name: string; class: string }> = {
  blue: { name: 'Sky Blue', class: 'bg-sky-500' },
  green: { name: 'Emerald', class: 'bg-emerald-500' },
  red: { name: 'Rose', class: 'bg-rose-500' },
  yellow: { name: 'Amber', class: 'bg-amber-500' },
  purple: { name: 'Violet', class: 'bg-violet-500' },
  orange: { name: 'Orange', class: 'bg-orange-500' },
  gray: { name: 'Slate', class: 'bg-slate-500' },
};
