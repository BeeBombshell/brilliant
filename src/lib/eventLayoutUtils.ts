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
  addDays,
} from "date-fns";
import type { CalendarEvent, MultiDayPosition, EventColumn, BlockStyle } from "@/types/calendar";
import { isSameCalendarDay, getDaysBetween } from "./dateUtils";

/**
 * Detects if an event spans multiple days
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const start = typeof event.startDate === "string" ? parseISO(event.startDate) : event.startDate;
  const end = typeof event.endDate === "string" ? parseISO(event.endDate) : event.endDate;

  // Check if end is exactly midnight
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0) {
    // If ends at midnight, subtract 1ms to check if it's the same day
    const adjustedEnd = new Date(end.getTime() - 1);
    const isDifferentDay = !isSameCalendarDay(start, adjustedEnd);

    if (isDifferentDay) return true;

    // If same calendar day (e.g. 00:00 -> 00:00 next day), check if it's a full 24h event
    // This catches "all day" events (12 AM - 12 AM) to put them in the top row
    const duration = end.getTime() - start.getTime();
    const isMidnightStart = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0 && start.getMilliseconds() === 0;

    if (isMidnightStart && duration >= 86400000) {
      return true;
    }

    return false;
  }

  return !isSameCalendarDay(start, end);
}

/**
 * Returns array of dates the event spans
 */
export function getEventDays(event: CalendarEvent): Date[] {
  return getDaysBetween(event.startDate, event.endDate);
}

/**
 * Groups overlapping events for side-by-side rendering
 * Only events that actually overlap get narrow widths
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

  if (dayEvents.length === 0) {
    return [];
  }

  // Sort by start time, then by duration (longer first)
  const sortedEvents = dayEvents.sort((a, b) => {
    const aStart = parseISO(a.startDate).getTime();
    const bStart = parseISO(b.startDate).getTime();
    if (aStart !== bStart) return aStart - bStart;

    const aDuration = parseISO(a.endDate).getTime() - aStart;
    const bDuration = parseISO(b.endDate).getTime() - bStart;
    return bDuration - aDuration;
  });

  // Helper to check if two events overlap
  const eventsOverlap = (e1: CalendarEvent, e2: CalendarEvent): boolean => {
    const e1Start = parseISO(e1.startDate).getTime();
    const e1End = parseISO(e1.endDate).getTime();
    const e2Start = parseISO(e2.startDate).getTime();
    const e2End = parseISO(e2.endDate).getTime();
    return e1Start < e2End && e2Start < e1End;
  };

  // Build overlap clusters - groups of events that share any overlap
  const clusters: CalendarEvent[][] = [];
  const eventToCluster = new Map<string, number>();

  sortedEvents.forEach((event) => {
    // Find all clusters this event overlaps with
    const overlappingClusters = new Set<number>();

    sortedEvents.forEach((other) => {
      if (other.id !== event.id && eventsOverlap(event, other)) {
        const clusterIdx = eventToCluster.get(other.id);
        if (clusterIdx !== undefined) {
          overlappingClusters.add(clusterIdx);
        }
      }
    });

    if (overlappingClusters.size === 0) {
      // No overlaps - create a new cluster with just this event
      const newClusterIdx = clusters.length;
      clusters.push([event]);
      eventToCluster.set(event.id, newClusterIdx);
    } else if (overlappingClusters.size === 1) {
      // Overlaps with one cluster - add to it
      const clusterIdx = Array.from(overlappingClusters)[0];
      clusters[clusterIdx].push(event);
      eventToCluster.set(event.id, clusterIdx);
    } else {
      // Overlaps with multiple clusters - merge them
      const clusterIndices = Array.from(overlappingClusters).sort((a, b) => a - b);
      const primaryIdx = clusterIndices[0];

      // Merge all clusters into the first one
      clusterIndices.slice(1).reverse().forEach((idx) => {
        clusters[primaryIdx].push(...clusters[idx]);
        clusters[idx].forEach((e) => eventToCluster.set(e.id, primaryIdx));
        clusters.splice(idx, 1);

        // Update cluster indices for events after the removed cluster
        eventToCluster.forEach((value, key) => {
          if (value > idx) {
            eventToCluster.set(key, value - 1);
          }
        });
      });

      clusters[primaryIdx].push(event);
      eventToCluster.set(event.id, primaryIdx);
    }
  });

  // Now layout each cluster independently
  const columns: EventColumn[] = [];

  clusters.forEach((cluster) => {
    if (cluster.length === 1) {
      // Single event in cluster - full width
      columns.push({
        event: cluster[0],
        left: 0,
        width: 100,
        zIndex: 0,
      });
    } else {
      // Multiple overlapping events - use column layout
      const clusterGroups: CalendarEvent[][] = [];

      for (const event of cluster) {
        const eventStart = parseISO(event.startDate);

        let placed = false;
        for (const group of clusterGroups) {
          const canPlace = group.every((groupEvent) => {
            const groupEnd = parseISO(groupEvent.endDate);
            return eventStart >= groupEnd;
          });

          if (canPlace) {
            group.push(event);
            placed = true;
            break;
          }
        }

        if (!placed) {
          clusterGroups.push([event]);
        }
      }

      const groupCount = clusterGroups.length;
      clusterGroups.forEach((group, groupIndex) => {
        group.forEach((event) => {
          columns.push({
            event,
            left: (groupIndex / groupCount) * 100,
            width: (1 / groupCount) * 100,
            zIndex: groupIndex,
          });
        });
      });
    }
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
  const dayEnd = addDays(dayStart, 1);

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
  let eventEnd = parseISO(event.endDate);

  // If ends at midnight, subtract 1ms to treat as ending on the previous day for visual formatting
  if (eventEnd.getHours() === 0 && eventEnd.getMinutes() === 0 && eventEnd.getSeconds() === 0 && eventEnd.getMilliseconds() === 0) {
    eventEnd = new Date(eventEnd.getTime() - 1);
  }

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
