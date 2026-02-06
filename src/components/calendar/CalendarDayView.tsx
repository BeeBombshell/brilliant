import { useState, useRef, useEffect, useMemo } from "react";
import { parseISO, differenceInMinutes, format, isToday, startOfDay, endOfDay } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";
import { CurrentTimeIndicator } from "@/components/calendar/CurrentTimeIndicator";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import { HappeningNowSidebar } from "@/components/calendar/HappeningNowSidebar";
import { EventCard } from "@/components/calendar/EventCard";
import { isMultiDayEvent, groupOverlappingEvents, getEventBlockStyle, getMultiDayPosition } from "@/lib/eventLayoutUtils";
import { MultiDayEventBadge } from "@/components/calendar/MultiDayEventBadge";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const minutesInDay = 24 * 60;
const HOUR_HEIGHT = 96; // 96px per hour (Big Calendar standard)
const DRAG_THRESHOLD = 5; // pixels - minimum movement to be considered a drag

export function CalendarDayView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { setSelectedEventId } = useCalendarActions();

  const dayStart = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    0,
    0,
    0
  );

  // Filter events for this day
  const allDayEvents = events.filter(event => {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    const dayStartTime = startOfDay(selectedDate);
    const dayEndTime = endOfDay(selectedDate);

    // Event overlaps with this day
    return start <= dayEndTime && end >= dayStartTime;
  });

  // Separate multi-day and single-day events
  const multiDayEvents = allDayEvents.filter(isMultiDayEvent);
  const singleDayEvents = allDayEvents.filter(event => !isMultiDayEvent(event));

  // Group overlapping single-day events for side-by-side layout
  const eventColumns = useMemo(() => groupOverlappingEvents(singleDayEvents, selectedDate), [singleDayEvents, selectedDate]);

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = event => {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;
    setDragStartY(y);
    setDragCurrentY(y);
    setIsDragging(false); // Reset dragging state
    container.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = event => {
    if (dragStartY == null) return;
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;
    setDragCurrentY(y);

    // Only set isDragging to true if we've moved beyond the threshold
    if (!isDragging && Math.abs(y - dragStartY) > DRAG_THRESHOLD) {
      setIsDragging(true);
    }
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = event => {
    const container = event.currentTarget;
    if (dragStartY == null || dragCurrentY == null) {
      container.releasePointerCapture(event.pointerId);
      setDragStartY(null);
      setDragCurrentY(null);
      setIsDragging(false);
      return;
    }

    // Only create an event if we actually dragged (beyond threshold)
    if (isDragging) {
      const startY = Math.min(dragStartY, dragCurrentY);
      const endY = Math.max(dragStartY, dragCurrentY);

      const totalHeight = container.scrollHeight;
      const startMinutes = (startY / totalHeight) * minutesInDay;
      const endMinutes = (endY / totalHeight) * minutesInDay;

      const snapTo = 30;
      const snappedStart = Math.floor(startMinutes / snapTo) * snapTo;
      const snappedEnd = Math.max(
        snappedStart + snapTo,
        Math.ceil(endMinutes / snapTo) * snapTo
      );

      const startDate = new Date(dayStart.getTime() + snappedStart * 60000);
      const endDate = new Date(dayStart.getTime() + snappedEnd * 60000);

      setDraft({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }

    container.releasePointerCapture(event.pointerId);
    setDragStartY(null);
    setDragCurrentY(null);
    setIsDragging(false);
  };

  const dragOverlay =
    isDragging && dragStartY != null && dragCurrentY != null
      ? {
        top: Math.min(dragStartY, dragCurrentY),
        height: Math.abs(dragCurrentY - dragStartY),
      }
      : null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  // Auto-scroll to current time on initial mount only
  useEffect(() => {
    if (scrollContainerRef.current && isToday(selectedDate) && !hasAutoScrolledRef.current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const top = (minutes / minutesInDay) * (24 * HOUR_HEIGHT);
      const containerHeight = scrollContainerRef.current.clientHeight;

      // Center the current time
      scrollContainerRef.current.scrollTop = top - containerHeight / 2;
      hasAutoScrolledRef.current = true;
    }
  }, [selectedDate]);

  return (
    <>
      <div className="flex h-full overflow-hidden bg-background">
        <div ref={scrollContainerRef} className="flex flex-1 flex-col overflow-auto">
          {/* Multi-day events row */}
          {multiDayEvents.length > 0 && (
            <div className="flex border-b">
              <div className="w-18 border-r" />
              <div className="flex flex-1 flex-col gap-1 py-1 px-2">
                {multiDayEvents.map(event => (
                  <MultiDayEventBadge
                    key={event.id}
                    event={event}
                    position={getMultiDayPosition(event, selectedDate)}
                    onClick={() => setSelectedEventId(event.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex min-w-full flex-1">
            {/* Hour labels column */}
            <div className="sticky left-0 z-30 w-18 flex-none border-r bg-background text-right text-xs text-muted-foreground">
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

            {/* Time grid */}
            <div className="relative flex-1">
              <div
                className="relative min-h-full"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {HOURS.map((hour, index) => (
                  <div
                    key={hour}
                    className="relative"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {index !== 0 && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 border-b" />
                    )}
                    {/* Half-hour dashed line */}
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed" />
                  </div>
                ))}

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

                {/* Current time indicator */}
                {isToday(selectedDate) && <CurrentTimeIndicator hourHeight={HOUR_HEIGHT} />}

                {/* Events with overlap support */}
                {eventColumns.map((column) => {
                  const event = column.event;
                  const start = parseISO(event.startDate);
                  const end = parseISO(event.endDate);
                  const durationMinutes = Math.max(
                    30, // Minimum 30 minutes for display purposes
                    differenceInMinutes(end, start)
                  );

                  const blockStyle = getEventBlockStyle(event, column, selectedDate);

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
          </div>
        </div>

        <HappeningNowSidebar events={events} onEventClick={(id) => setSelectedEventId(id)} />
      </div>
    </>
  );
}

