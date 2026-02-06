import {
  isSameDay,
  eachDayOfInterval,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInMilliseconds,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";
import type { CalendarEvent, RecurrenceRule } from "@/types/calendar";

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

// --- Recurring Event Expansion ---

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

/**
 * Advance a date by one recurrence interval based on frequency.
 */
function advanceDate(date: Date, frequency: RecurrenceRule["frequency"], interval: number): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(date, interval);
    case "WEEKLY":
      return addWeeks(date, interval);
    case "MONTHLY":
      return addMonths(date, interval);
    case "YEARLY":
      return addYears(date, interval);
  }
}

/**
 * Check if a date's day-of-week matches the byDay filter.
 */
function matchesByDay(date: Date, byDay: string[]): boolean {
  const dow = date.getDay(); // 0=Sun … 6=Sat
  return byDay.some(d => DAY_MAP[d.toUpperCase()] === dow);
}

/**
 * Expand a single recurring event into concrete instances within a visible window.
 * Non-recurring events are returned as-is (in a single-element array).
 *
 * Each generated instance receives:
 *  - a deterministic `id` like `<parentId>_<isoDate>` so it's stable across renders
 *  - `recurringEventId` pointing back to the parent
 *  - `isInstance: true`
 *
 * The expansion is bounded by `rangeStart` / `rangeEnd` AND the recurrence's own
 * `count` / `endDate` limits.  A hard cap of 365 iterations prevents runaway loops.
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  if (!event.recurrence) return [event];
  // If this event is already an instance, don't expand it further
  if (event.isInstance) return [event];

  const rule = event.recurrence;
  const interval = rule.interval ?? 1;
  const eventStart = parseISO(event.startDate);
  const eventEnd = parseISO(event.endDate);
  const duration = differenceInMilliseconds(eventEnd, eventStart);

  const ruleEnd = rule.endDate ? parseISO(rule.endDate) : null;
  const maxCount = rule.count ?? 365; // hard cap
  const MAX_ITERATIONS = 365;

  const instances: CalendarEvent[] = [];
  let cursor = new Date(eventStart);
  let count = 0;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Stop if we've passed the recurrence end date
    if (ruleEnd && isAfter(startOfDay(cursor), startOfDay(ruleEnd))) break;
    // Stop if we've generated enough occurrences
    if (count >= maxCount) break;
    // Stop if we've gone past the visible range
    if (isAfter(cursor, rangeEnd)) break;

    // For WEEKLY + byDay, check if cursor's day matches
    const dayMatches =
      rule.frequency === "WEEKLY" && rule.byDay && rule.byDay.length > 0
        ? matchesByDay(cursor, rule.byDay)
        : true;

    if (dayMatches) {
      const instanceStart = cursor;
      const instanceEnd = new Date(cursor.getTime() + duration);

      // Only include if the instance overlaps the visible range
      if (!isBefore(instanceEnd, rangeStart) && !isAfter(instanceStart, rangeEnd)) {
        const dateKey = instanceStart.toISOString().slice(0, 10); // YYYY-MM-DD
        instances.push({
          ...event,
          id: `${event.id}_${dateKey}`,
          startDate: instanceStart.toISOString(),
          endDate: instanceEnd.toISOString(),
          recurringEventId: event.id,
          isInstance: true,
        });
      }
      count++;
    }

    // Advance cursor
    if (rule.frequency === "WEEKLY" && rule.byDay && rule.byDay.length > 0) {
      // For byDay weekly, advance day-by-day within each week
      cursor = addDays(cursor, 1);
      // After cycling through a full week, skip ahead by (interval-1) weeks
      const daysSinceStart = Math.round(
        (cursor.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceStart > 0 && daysSinceStart % 7 === 0 && interval > 1) {
        cursor = addWeeks(cursor, interval - 1);
      }
    } else {
      cursor = advanceDate(cursor, rule.frequency, interval);
    }
  }

  return instances;
}

/**
 * Expand ALL events in the array, producing recurring instances within the
 * visible date range.  Non-recurring events pass through unchanged.
 */
export function expandAllRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  return events.flatMap(event => expandRecurringEvent(event, rangeStart, rangeEnd));
}
