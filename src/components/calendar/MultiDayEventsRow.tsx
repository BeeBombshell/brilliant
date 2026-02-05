import { useMemo, useState } from "react";
import { parseISO, startOfWeek, endOfWeek, addDays, differenceInDays, isBefore, isAfter, startOfDay } from "date-fns";
import { MultiDayEventBadge } from "./MultiDayEventBadge";
import { isMultiDayEvent, getMultiDayPosition } from "@/lib/eventLayoutUtils";
import type { CalendarEvent } from "@/types/calendar";

interface MultiDayEventsRowProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function MultiDayEventsRow({
  events,
  selectedDate,
  onEventClick,
}: MultiDayEventsRowProps) {
  const [showAll, setShowAll] = useState(false);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Filter to multi-day events only
  const multiDayEvents = useMemo(() => {
    return events.filter(isMultiDayEvent);
  }, [events]);

  // Process events to calculate their week-relative positions
  const processedEvents = useMemo(() => {
    return multiDayEvents
      .map((event) => {
        const start = parseISO(event.startDate);
        const end = parseISO(event.endDate);
        const adjustedStart = isBefore(start, weekStart) ? weekStart : start;
        const adjustedEnd = isAfter(end, weekEnd) ? weekEnd : end;
        const startIndex = differenceInDays(adjustedStart, weekStart);
        const endIndex = differenceInDays(adjustedEnd, weekStart);

        return {
          ...event,
          adjustedStart,
          adjustedEnd,
          startIndex,
          endIndex,
        };
      })
      .sort((a, b) => {
        const startDiff = a.adjustedStart.getTime() - b.adjustedStart.getTime();
        if (startDiff !== 0) return startDiff;
        return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
      });
  }, [multiDayEvents, weekStart, weekEnd]);

  // Group events into rows to avoid overlap
  const eventRows = useMemo(() => {
    const rows: (typeof processedEvents)[] = [];

    processedEvents.forEach((event) => {
      let rowIndex = rows.findIndex((row) =>
        row.every((e) => e.endIndex < event.startIndex || e.startIndex > event.endIndex)
      );

      if (rowIndex === -1) {
        rowIndex = rows.length;
        rows.push([]);
      }

      rows[rowIndex].push(event);
    });

    return rows;
  }, [processedEvents]);

  const hasEventsInWeek = useMemo(() => {
    return multiDayEvents.some((event) => {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);

      const inWeek = (
        (start >= weekStart && start <= weekEnd) ||
        (end >= weekStart && end <= weekEnd) ||
        (start <= weekStart && end >= weekEnd)
      );

      return inWeek;
    });
  }, [multiDayEvents, weekStart, weekEnd]);

  if (!hasEventsInWeek) {
    return null;
  }

  const visibleRows = showAll ? eventRows : eventRows.slice(0, 3);
  const hiddenCount = eventRows.length - visibleRows.length;

  return (
    <div className="flex min-h-fit bg-background">
      <div className="w-18 border-b bg-background" />
      <div className="grid flex-1 grid-cols-7 divide-x border-b border-l bg-background">
        {weekDays.map((day, dayIndex) => {
          return (
          <div key={day.toISOString()} className="flex flex-col gap-1 py-1 min-h-[100px] bg-background">
            {visibleRows.map((row, rowIndex) => {
              const event = row.find((e) => e.startIndex <= dayIndex && e.endIndex >= dayIndex);

              if (!event) {
                return <div key={`${rowIndex}-${dayIndex}`} className="h-6.5" />;
              }

              const position = getMultiDayPosition(event, startOfDay(day));

              return (
                <MultiDayEventBadge
                  key={`${event.id}-${dayIndex}`}
                  event={event}
                  position={position}
                  onClick={() => onEventClick?.(event)}
                />
              );
            })}
            {dayIndex === 0 && hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="h-6.5 mx-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showAll ? "Show less" : `+${hiddenCount} more`}
              </button>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
