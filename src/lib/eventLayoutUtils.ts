import {
  parseISO,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  differenceInDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import type { CalendarEvent, MultiDayPosition, EventColumn, BlockStyle } from "@/types/calendar";
import { isSameCalendarDay, getDaysBetween } from "./dateUtils";

/**
 * Detects if an event spans multiple days
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  return !isSameCalendarDay(event.startDate, event.endDate);
}

/**
 * Returns array of dates the event spans
 */
export function getEventDays(event: CalendarEvent): Date[] {
  return getDaysBetween(event.startDate, event.endDate);
}

/**
 * Groups overlapping events for side-by-side rendering
 * Adapted from big-calendar's groupEvents
 */
export function groupOverlappingEvents(events: CalendarEvent[], day: Date): EventColumn[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  // Filter events that occur on this day
  const dayEvents = events.filter((event) => {
    const eventStart = parseISO(event.startDate);
    const eventEnd = parseISO(event.endDate);
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });

  // Sort by start time, then by duration (longer first)
  const sortedEvents = dayEvents.sort((a, b) => {
    const aStart = parseISO(a.startDate).getTime();
    const bStart = parseISO(b.startDate).getTime();
    if (aStart !== bStart) return aStart - bStart;

    const aDuration = parseISO(a.endDate).getTime() - aStart;
    const bDuration = parseISO(b.endDate).getTime() - bStart;
    return bDuration - aDuration;
  });

  // Create groups of non-overlapping events
  const groups: CalendarEvent[][] = [];

  for (const event of sortedEvents) {
    const eventStart = parseISO(event.startDate);

    let placed = false;
    for (const group of groups) {
      const lastEventInGroup = group[group.length - 1];
      const lastEventEnd = parseISO(lastEventInGroup.endDate);

      if (eventStart >= lastEventEnd) {
        group.push(event);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push([event]);
    }
  }

  // Calculate positions
  const columns: EventColumn[] = [];
  const groupCount = groups.length;

  groups.forEach((group, groupIndex) => {
    group.forEach((event) => {
      columns.push({
        event,
        left: (groupIndex / groupCount) * 100,
        width: (1 / groupCount) * 100,
        zIndex: groupIndex,
      });
    });
  });

  return columns;
}

/**
 * Returns positioning styles for an event block
 * Adapted from big-calendar's getEventBlockStyle
 */
export function getEventBlockStyle(
  event: CalendarEvent,
  column: EventColumn,
  day: Date,
  visibleHoursRange?: { from: number; to: number }
): BlockStyle {
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  // Clamp event to day boundaries
  const eventStart = startDate < dayStart ? dayStart : startDate;
  const eventEnd = endDate > dayEnd ? dayEnd : endDate;

  const startMinutes = differenceInMinutes(eventStart, dayStart);
  const duration = differenceInMinutes(eventEnd, eventStart);

  let top: number;
  let height: number;

  if (visibleHoursRange) {
    const visibleStartMinutes = visibleHoursRange.from * 60;
    const visibleEndMinutes = visibleHoursRange.to * 60;
    const visibleRangeMinutes = visibleEndMinutes - visibleStartMinutes;

    top = ((startMinutes - visibleStartMinutes) / visibleRangeMinutes) * 100;
    height = (duration / visibleRangeMinutes) * 100;
  } else {
    // Full day: 1440 minutes
    top = (startMinutes / 1440) * 100;
    height = (duration / 1440) * 100;
  }

  return {
    top: `${top}%`,
    left: `${column.left}%`,
    width: `${column.width}%`,
    height: `${height}%`,
    zIndex: column.zIndex,
  };
}

/**
 * Allocates event slots for month view (max 3 visible per day)
 * Adapted from big-calendar's calculateMonthEventPositions
 */
export function calculateMonthEventSlots(
  events: CalendarEvent[],
  selectedDate: Date
): Record<string, number> {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const eventPositions: Record<string, number> = {};
  const occupiedPositions: Record<string, boolean[]> = {};

  // Initialize occupied positions for each day
  eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach((day) => {
    occupiedPositions[startOfDay(day).toISOString()] = [false, false, false];
  });

  // Separate multi-day and single-day events
  const multiDayEvents = events.filter(isMultiDayEvent);
  const singleDayEvents = events.filter((e) => !isMultiDayEvent(e));

  // Sort: multi-day by duration (longer first), single-day by start time
  const sortedEvents = [
    ...multiDayEvents.sort((a, b) => {
      const aDuration = differenceInDays(parseISO(a.endDate), parseISO(a.startDate));
      const bDuration = differenceInDays(parseISO(b.endDate), parseISO(b.startDate));
      return bDuration - aDuration || parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
    }),
    ...singleDayEvents.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
  ];

  // Allocate positions
  sortedEvents.forEach((event) => {
    const eventStart = parseISO(event.startDate);
    const eventEnd = parseISO(event.endDate);
    const eventDays = eachDayOfInterval({
      start: eventStart < monthStart ? monthStart : eventStart,
      end: eventEnd > monthEnd ? monthEnd : eventEnd,
    });

    // Find first available position across all event days
    let position = -1;

    for (let i = 0; i < 3; i++) {
      if (
        eventDays.every((day) => {
          const dayPositions = occupiedPositions[startOfDay(day).toISOString()];
          return dayPositions && !dayPositions[i];
        })
      ) {
        position = i;
        break;
      }
    }

    // Mark position as occupied
    if (position !== -1) {
      eventDays.forEach((day) => {
        const dayKey = startOfDay(day).toISOString();
        occupiedPositions[dayKey][position] = true;
      });
      eventPositions[event.id] = position;
    }
  });

  return eventPositions;
}

/**
 * Determines the position variant for multi-day event rendering
 */
export function getMultiDayPosition(event: CalendarEvent, currentDay: Date): MultiDayPosition {
  const eventStart = parseISO(event.startDate);
  const eventEnd = parseISO(event.endDate);

  if (isSameDay(currentDay, eventStart) && isSameDay(currentDay, eventEnd)) {
    return "none";
  } else if (isSameDay(currentDay, eventStart)) {
    return "first";
  } else if (isSameDay(currentDay, eventEnd)) {
    return "last";
  } else if (currentDay > eventStart && currentDay < eventEnd) {
    return "middle";
  }

  return "none";
}

/**
 * Calculates percentage-based top/height for time-grid views
 */
export function calculateEventTimes(
  event: CalendarEvent,
  day: Date,
  visibleHoursRange?: { from: number; to: number }
): { top: number; height: number } {
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const eventStart = startDate < dayStart ? dayStart : startDate;
  const eventEnd = endDate > dayEnd ? dayEnd : endDate;

  const startMinutes = differenceInMinutes(eventStart, dayStart);
  const duration = differenceInMinutes(eventEnd, eventStart);

  if (visibleHoursRange) {
    const visibleStartMinutes = visibleHoursRange.from * 60;
    const visibleEndMinutes = visibleHoursRange.to * 60;
    const visibleRangeMinutes = visibleEndMinutes - visibleStartMinutes;

    return {
      top: ((startMinutes - visibleStartMinutes) / visibleRangeMinutes) * 100,
      height: (duration / visibleRangeMinutes) * 100,
    };
  }

  return {
    top: (startMinutes / 1440) * 100,
    height: (duration / 1440) * 100,
  };
}
