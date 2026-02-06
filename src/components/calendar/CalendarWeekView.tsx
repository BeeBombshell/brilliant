import { useRef, useState, useEffect } from "react";
import { addDays, format, parseISO, isToday } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import { CurrentTimeIndicator } from "@/components/calendar/CurrentTimeIndicator";
import { MultiDayEventsRow } from "@/components/calendar/MultiDayEventsRow";
import { EventCard } from "@/components/calendar/EventCard";
import { isMultiDayEvent, groupOverlappingEvents, getEventBlockStyle } from "@/lib/eventLayoutUtils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const minutesInDay = 24 * 60;
const HOUR_HEIGHT = 96; // 96px per hour (Big Calendar standard)
const DRAG_THRESHOLD = 5; // pixels - minimum movement to be considered a drag

type DragColumnCache = {
  columns: {
    dayIndex: number;
    left: number;
    right: number;
    timeGrid: HTMLElement | null;
  }[];
};

export function CalendarWeekView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const dayColumnsRef = useRef<HTMLDivElement | null>(null);
  const dragColumnCacheRef = useRef<DragColumnCache | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const [dragState, setDragState] = useState<{
    startDayIndex: number;
    currentDayIndex: number;
    startY: number;
    currentY: number;
    containerHeight: number;
    isDragging: boolean;
  } | null>(null);
  const { setSelectedEventId } = useCalendarActions();

  const dayOfWeek = selectedDate.getDay();
  const weekStart = addDays(selectedDate, -dayOfWeek);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Auto-scroll to current time on initial mount only
  useEffect(() => {
    const isTodayInWeek = days.some(day => isToday(day));
    if (scrollContainerRef.current && isTodayInWeek && !hasAutoScrolledRef.current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const top = (minutes / minutesInDay) * (24 * HOUR_HEIGHT);
      const containerHeight = scrollContainerRef.current.clientHeight;

      // Center the current time
      scrollContainerRef.current.scrollTop = top - containerHeight / 2;
      hasAutoScrolledRef.current = true;
    }
  }, [selectedDate, days]);

  const rebuildDragColumnCache = (): DragColumnCache | null => {
    const dayColumnsContainer = dayColumnsRef.current;
    if (!dayColumnsContainer) return null;

    const cache = {
      columns: Array.from(dayColumnsContainer.querySelectorAll<HTMLElement>("[data-day-index]")).map((element) => {
        const columnRect = element.getBoundingClientRect();
        const columnDayIndex = Number(element.dataset.dayIndex);
        const timeGrid = element.querySelector<HTMLElement>("[data-time-grid]");

        return {
          dayIndex: columnDayIndex,
          left: columnRect.left,
          right: columnRect.right,
          timeGrid,
        };
      }),
    } satisfies DragColumnCache;

    dragColumnCacheRef.current = cache;
    return cache;
  };

  const handlePointerDown = (dayIndex: number) =>
  ((event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;

    rebuildDragColumnCache();

    setDragState({
      startDayIndex: dayIndex,
      currentDayIndex: dayIndex,
      startY: y,
      currentY: y,
      containerHeight: container.scrollHeight,
      isDragging: false
    });
    container.setPointerCapture(event.pointerId);
  });

  // Global pointer move handler to detect day changes
  const handleGlobalPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;

    let columnCache = dragColumnCacheRef.current;
    if (!columnCache) {
      columnCache = rebuildDragColumnCache();
    }
    if (!columnCache) return;

    // Find which day column the pointer is over
    const findDayIndexAtClientX = (cache: DragColumnCache): number | null => {
      for (const column of cache.columns) {
        if (event.clientX >= column.left && event.clientX <= column.right) {
          return column.dayIndex;
        }
      }
      return null;
    };

    let foundDayIndex = findDayIndexAtClientX(columnCache);
    if (foundDayIndex === null) {
      const refreshedCache = rebuildDragColumnCache();
      if (refreshedCache) {
        columnCache = refreshedCache;
        foundDayIndex = findDayIndexAtClientX(columnCache);
      }
    }

    const currentDayIndex = foundDayIndex ?? dragState.currentDayIndex;

    // Get the Y position relative to the current day column
    const currentColumn = columnCache.columns.find((column) => column.dayIndex === currentDayIndex);
    const timeGrid = currentColumn?.timeGrid;
    if (timeGrid) {
      const rect = timeGrid.getBoundingClientRect();
      const y = event.clientY - rect.top + timeGrid.scrollTop;
      setDragState(current => {
        if (!current) return current;
        const isDragging = current.isDragging || Math.abs(y - current.startY) > DRAG_THRESHOLD;
        return { ...current, currentDayIndex, currentY: y, isDragging };
      });
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const container = event.currentTarget;
    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
    if (!dragState) {
      dragColumnCacheRef.current = null;
      setDragState(null);
      return;
    }

    // Only create an event if we actually dragged (beyond threshold)
    if (dragState.isDragging) {
      const startDayIdx = Math.min(dragState.startDayIndex, dragState.currentDayIndex);
      const endDayIdx = Math.max(dragState.startDayIndex, dragState.currentDayIndex);
      const isMultiDay = startDayIdx !== endDayIdx;

      const startY = Math.min(dragState.startY, dragState.currentY);
      const endY = Math.max(dragState.startY, dragState.currentY);

      const totalHeight = dragState.containerHeight;
      const startMinutes = (startY / totalHeight) * minutesInDay;
      const endMinutes = (endY / totalHeight) * minutesInDay;

      const snapTo = 30;
      const snappedStart = Math.floor(startMinutes / snapTo) * snapTo;
      const snappedEnd = Math.max(
        snappedStart + snapTo,
        Math.ceil(endMinutes / snapTo) * snapTo
      );

      // Get the start and end days
      const startDay = days[startDayIdx];
      const endDay = days[endDayIdx];

      const startDayTime = new Date(
        startDay.getFullYear(),
        startDay.getMonth(),
        startDay.getDate(),
        0,
        0,
        0
      );

      const endDayTime = new Date(
        endDay.getFullYear(),
        endDay.getMonth(),
        endDay.getDate(),
        0,
        0,
        0
      );

      // For multi-day events, use the full time range from first day to last day
      let startDate: Date;
      let endDate: Date;

      if (isMultiDay) {
        // Multi-day: start time on first day, end time on last day
        startDate = new Date(startDayTime.getTime() + snappedStart * 60000);
        endDate = new Date(endDayTime.getTime() + snappedEnd * 60000);
      } else {
        // Single day: normal behavior
        startDate = new Date(startDayTime.getTime() + snappedStart * 60000);
        endDate = new Date(startDayTime.getTime() + snappedEnd * 60000);
      }

      setDraft({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }

    dragColumnCacheRef.current = null;
    setDragState(null);
  };

  return (
    <>
      <div ref={scrollContainerRef} className="flex h-full flex-col overflow-auto bg-background">
        {/* Sticky header section */}
        <div className="sticky top-0 z-40 bg-background">
          {/* Multi-day events row */}
          <MultiDayEventsRow
            events={events}
            selectedDate={selectedDate}
            onEventClick={(id) => setSelectedEventId(id)}
          />

          {/* Day names row */}
          <div className="flex">
            <div className="w-18 border-b bg-background" />
            <div className="flex flex-1">
              {days.map((day) => (
                <div
                  key={`header-${day.toISOString()}`}
                  className="flex h-10 flex-1 items-center justify-center border-b border-r bg-background text-xs font-medium last:border-r-0"
                >
                  <span className="text-muted-foreground">{format(day, "EEE")}</span>
                  <span className="ml-1 font-semibold">{format(day, "d")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-fit flex-1">
          {/* Hour labels column */}
          <div className="sticky left-0 z-30 flex w-18 flex-none flex-col border-r bg-background">
            {/* Empty spacer - hours start below the time grid */}
            <div className="text-right text-xs text-muted-foreground">
              {HOURS.map((hour, index) => (
                <div key={hour} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                  {index !== 0 && (
                    <div className="absolute -top-3 right-2 flex h-6 items-center">
                      <span>{format(new Date().setHours(hour, 0, 0, 0), "hh a")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          <div
            className="flex flex-1"
            onPointerMove={handleGlobalPointerMove}
            ref={dayColumnsRef}
          >
            {days.map((day, index) => {
              // Filter to single-day events only (multi-day events are in the row above)
              const dayEvents = events.filter(event => {
                const start = parseISO(event.startDate);
                return (
                  !isMultiDayEvent(event) &&
                  start.getFullYear() === day.getFullYear() &&
                  start.getMonth() === day.getMonth() &&
                  start.getDate() === day.getDate()
                );
              });

              // Group overlapping events for side-by-side layout
              const eventColumns = groupOverlappingEvents(dayEvents, day);

              // Check if this day is part of the drag selection
              const minDayIdx = dragState ? Math.min(dragState.startDayIndex, dragState.currentDayIndex) : -1;
              const maxDayIdx = dragState ? Math.max(dragState.startDayIndex, dragState.currentDayIndex) : -1;
              const isDayInDragRange = dragState && dragState.isDragging && index >= minDayIdx && index <= maxDayIdx;

              // Calculate overlay based on position in drag range
              let dragOverlay = null;
              if (isDayInDragRange && dragState) {
                const isFirstDay = index === minDayIdx;
                const isLastDay = index === maxDayIdx;
                const isMiddleDay = !isFirstDay && !isLastDay;
                const isSingleDay = minDayIdx === maxDayIdx;

                if (isSingleDay) {
                  // Single day: show time range
                  dragOverlay = {
                    top: Math.min(dragState.startY, dragState.currentY),
                    height: Math.abs(dragState.currentY - dragState.startY),
                  };
                } else if (isFirstDay) {
                  // First day: from start time to end of day
                  const startY = Math.min(dragState.startY, dragState.currentY);
                  dragOverlay = {
                    top: startY,
                    height: (HOURS.length * HOUR_HEIGHT) - startY,
                  };
                } else if (isLastDay) {
                  // Last day: from start of day to end time
                  const endY = Math.max(dragState.startY, dragState.currentY);
                  dragOverlay = {
                    top: 0,
                    height: endY,
                  };
                } else if (isMiddleDay) {
                  // Middle days: full day
                  dragOverlay = {
                    top: 0,
                    height: HOURS.length * HOUR_HEIGHT,
                  };
                }
              }

              return (
                <div
                  key={day.toISOString()}
                  className="min-w-[140px] flex-1 border-r last:border-r-0"
                  data-day-index={index}
                >
                  {/* Time grid */}
                  <div
                    className="relative"
                    data-time-grid
                    onPointerDown={handlePointerDown(index)}
                    onPointerUp={handlePointerUp}
                  >
                    {HOURS.map((hour, hourIndex) => (
                      <div
                        key={hour}
                        className="relative"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        {hourIndex !== 0 && (
                          <div className="pointer-events-none absolute inset-x-0 top-0 border-b" />
                        )}
                        {/* Half-hour dashed line */}
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed" />
                      </div>
                    ))}

                    {/* Current time indicator */}
                    {isToday(day) && <CurrentTimeIndicator hourHeight={HOUR_HEIGHT} />}

                    {/* Drag overlay */}
                    {dragOverlay && (
                      <div
                        className="pointer-events-none absolute left-1 right-1 rounded-md border-2 border-primary bg-primary/10"
                        style={{
                          top: dragOverlay.top,
                          height: dragOverlay.height,
                        }}
                      />
                    )}

                    {/* Events with overlap support */}
                    {eventColumns.map((column) => {
                      const event = column.event;
                      const start = parseISO(event.startDate);
                      const end = parseISO(event.endDate);
                      const durationMinutes = Math.max(
                        30, // Minimum 30 minutes for display purposes
                        (end.getTime() - start.getTime()) / 60000
                      );

                      const blockStyle = getEventBlockStyle(event, column, day);

                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          durationMinutes={durationMinutes}
                          onClick={() => setSelectedEventId(event.id)}
                          onPointerDown={(e) => e.stopPropagation()}
                          style={{
                            top: blockStyle.top,
                            left: blockStyle.left,
                            width: blockStyle.width,
                            height: blockStyle.height,
                            zIndex: blockStyle.zIndex,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

