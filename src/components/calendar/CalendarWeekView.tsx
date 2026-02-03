import { useState } from "react";
import { addDays, format, parseISO, isToday } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";
import { CurrentTimeIndicator } from "@/components/calendar/CurrentTimeIndicator";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import type { EventColor, CalendarEvent } from "@/types/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const minutesInDay = 24 * 60;
const HOUR_HEIGHT = 96; // 96px per hour (Big Calendar standard)

// Dot color classes for the colored indicator
const dotColorClasses: Record<EventColor, string> = {
  blue: "fill-sky-600",
  green: "fill-emerald-600",
  red: "fill-rose-600",
  yellow: "fill-amber-600",
  purple: "fill-violet-600",
  orange: "fill-orange-600",
  gray: "fill-slate-600",
};

const DRAG_THRESHOLD = 5; // pixels - minimum movement to be considered a drag

export function CalendarWeekView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const [dragState, setDragState] = useState<{
    dayIndex: number;
    startY: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const dayOfWeek = selectedDate.getDay();
  const weekStart = addDays(selectedDate, -dayOfWeek);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePointerDown = (dayIndex: number) =>
  ((event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;
    setDragState({ dayIndex, startY: y, currentY: y, isDragging: false });
    container.setPointerCapture(event.pointerId);
  });

  const handlePointerMove =
    (dayIndex: number) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState || dragState.dayIndex !== dayIndex) return;
      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const y = event.clientY - rect.top + container.scrollTop;

      // Only set isDragging to true if we've moved beyond the threshold
      const isDragging = dragState.isDragging || Math.abs(y - dragState.startY) > DRAG_THRESHOLD;

      setDragState(current =>
        current ? { ...current, currentY: y, isDragging } : current
      );
    };

  const handlePointerUp =
    (dayIndex: number, day: Date) =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        const container = event.currentTarget;
        if (!dragState || dragState.dayIndex !== dayIndex) {
          container.releasePointerCapture(event.pointerId);
          setDragState(null);
          return;
        }

        // Only create an event if we actually dragged (beyond threshold)
        if (dragState.isDragging) {
          const startY = Math.min(dragState.startY, dragState.currentY);
          const endY = Math.max(dragState.startY, dragState.currentY);

          const totalHeight = container.scrollHeight;
          const startMinutes = (startY / totalHeight) * minutesInDay;
          const endMinutes = (endY / totalHeight) * minutesInDay;

          const snapTo = 30;
          const snappedStart = Math.floor(startMinutes / snapTo) * snapTo;
          const snappedEnd = Math.max(
            snappedStart + snapTo,
            Math.ceil(endMinutes / snapTo) * snapTo
          );

          const dayStart = new Date(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            0,
            0,
            0
          );

          const startDate = new Date(dayStart.getTime() + snappedStart * 60000);
          const endDate = new Date(dayStart.getTime() + snappedEnd * 60000);

          setDraft({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        }

        container.releasePointerCapture(event.pointerId);
        setDragState(null);
      };

  return (
    <>
      <EventDetailsDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
      <div className="flex h-full flex-col overflow-auto bg-background">
        <div className="flex min-w-fit flex-1">
          {/* Hour labels column */}
          <div className="sticky left-0 z-30 flex w-18 flex-none flex-col border-r bg-background">
            <div className="sticky top-0 z-40 h-10 border-b bg-background" />
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
          <div className="flex flex-1">
            {days.map((day, index) => {
              const dayStart = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                0,
                0,
                0
              );

              const dayEvents = events.filter(event => {
                const start = parseISO(event.startDate);
                return (
                  start.getFullYear() === day.getFullYear() &&
                  start.getMonth() === day.getMonth() &&
                  start.getDate() === day.getDate()
                );
              });

              const dragOverlay =
                dragState && dragState.dayIndex === index && dragState.isDragging
                  ? {
                    top: Math.min(dragState.startY, dragState.currentY),
                    height: Math.abs(dragState.currentY - dragState.startY),
                  }
                  : null;

              return (
                <div
                  key={day.toISOString()}
                  className="min-w-[140px] flex-1 border-r last:border-r-0"
                >
                  {/* Day header */}
                  <div className="sticky top-0 z-20 flex h-10 items-center justify-center border-b bg-background text-xs font-medium">
                    <span className="text-muted-foreground">{format(day, "EEE")}</span>
                    <span className="ml-1 font-semibold">{format(day, "d")}</span>
                  </div>

                  {/* Time grid */}
                  <div
                    className="relative"
                    onPointerDown={handlePointerDown(index)}
                    onPointerMove={handlePointerMove(index)}
                    onPointerUp={handlePointerUp(index, day)}
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

                    {/* Events */}
                    {dayEvents.map(event => {
                      const start = parseISO(event.startDate);
                      const end = parseISO(event.endDate);
                      const topMinutes =
                        (start.getTime() - dayStart.getTime()) / 60000;
                      const actualDuration = (end.getTime() - start.getTime()) / 60000;
                      const durationMinutes = Math.max(
                        30, // Minimum 30 minutes for display purposes
                        actualDuration
                      );

                      const topPercent = (topMinutes / minutesInDay) * 100;
                      const heightPercent =
                        (durationMinutes / minutesInDay) * 100;

                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          onPointerDown={(e) => {
                            // Stop propagation to prevent the grid's drag handler from firing
                            e.stopPropagation();
                          }}
                          onPointerMove={(e) => {
                            // Stop propagation to prevent the grid's drag handler from firing
                            e.stopPropagation();
                          }}
                          onPointerUp={(e) => {
                            // Stop propagation to prevent the grid's drag handler from firing
                            e.stopPropagation();
                          }}
                          className="absolute flex left-1 right-1 overflow-hidden rounded-md border border-border bg-muted/50 px-2 pt-1 pb-2 text-left text-xs text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPercent}%`,
                          }}
                        >
                          <div className="flex items-start gap-1.5 mt-2">
                            <svg width="8" height="8" viewBox="0 0 8 8" className={`shrink-0 ${dotColorClasses[event.color]}`}>
                              <circle cx="4" cy="4" r="4" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold leading-tight">{event.title}</div>
                              {actualDuration > 30 && event.description && (
                                <div className="mt-0.5 line-clamp-2 text-[0.7rem] leading-tight text-muted-foreground">
                                  {event.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
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

