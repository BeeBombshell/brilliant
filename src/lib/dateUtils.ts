import { isSameDay, eachDayOfInterval, parseISO, addDays } from "date-fns";

/**
 * Returns all dates between start and end (inclusive)
 */
export function getDaysBetween(start: Date | string, end: Date | string): Date[] {
  const startDate = typeof start === "string" ? parseISO(start) : start;
  const endDate = typeof end === "string" ? parseISO(end) : end;

  return eachDayOfInterval({ start: startDate, end: endDate });
}

/**
 * Checks if two dates are on the same calendar day
 * Supports both Date objects and ISO strings
 */
export function isSameCalendarDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === "string" ? parseISO(date1) : date1;
  const d2 = typeof date2 === "string" ? parseISO(date2) : date2;

  return isSameDay(d1, d2);
}

/**
 * Returns array of 7 days starting from weekStart
 */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Snaps time to grid intervals (15, 30, 60 minutes)
 */
export function snapToGrid(minutes: number, interval: number): number {
  return Math.round(minutes / interval) * interval;
}
