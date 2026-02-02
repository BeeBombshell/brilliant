import { useState } from "react";
import { parseISO, differenceInMinutes, format, isToday } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";
import { CurrentTimeIndicator } from "@/components/calendar/CurrentTimeIndicator";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import { HappeningNowSidebar } from "@/components/calendar/HappeningNowSidebar";
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

export function CalendarDayView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const dayStart = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    0,
    0,
    0
  );

  const dayEvents = events.filter(event => {
    const start = parseISO(event.startDate);
    return (
      start.getFullYear() === selectedDate.getFullYear() &&
      start.getMonth() === selectedDate.getMonth() &&
      start.getDate() === selectedDate.getDate()
    );
  });

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = event => {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;
    setDragStartY(y);
    setDragCurrentY(y);
    container.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = event => {
    if (dragStartY == null) return;
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const y = event.clientY - rect.top + container.scrollTop;
    setDragCurrentY(y);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = event => {
    const container = event.currentTarget;
    if (dragStartY == null || dragCurrentY == null) {
      container.releasePointerCapture(event.pointerId);
      setDragStartY(null);
      setDragCurrentY(null);
      return;
    }

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

    container.releasePointerCapture(event.pointerId);
    setDragStartY(null);
    setDragCurrentY(null);
  };

  const dragOverlay =
    dragStartY != null && dragCurrentY != null
      ? {
        top: Math.min(dragStartY, dragCurrentY),
        height: Math.abs(dragCurrentY - dragStartY),
      }
      : null;

  return (
    <>
      <EventDetailsDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
      <div className="flex h-full overflow-hidden bg-background">
        <div className="flex flex-1 flex-col overflow-auto">
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

                {/* Events */}
                {dayEvents.map(event => {
                  const start = parseISO(event.startDate);
                  const end = parseISO(event.endDate);
                  const topMinutes = differenceInMinutes(start, dayStart);
                  const durationMinutes = Math.max(
                    30,
                    differenceInMinutes(end, start)
                  );

                  const topPercent = (topMinutes / minutesInDay) * 100;
                  const heightPercent = (durationMinutes / minutesInDay) * 100;

                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="absolute left-1 right-1 overflow-hidden rounded-md border border-border bg-muted/50 px-2 pt-1 pb-2 text-left text-xs text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{
                        top: `${topPercent}%`,
                        height: `${heightPercent}%`,
                      }}
                    >
                      <div className="flex items-start gap-1.5">
                        <svg width="8" height="8" viewBox="0 0 8 8" className={`shrink-0 ${dotColorClasses[event.color]}`}>
                          <circle cx="4" cy="4" r="4" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold leading-tight">{event.title}</div>
                          {durationMinutes > 25 && event.description && (
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
          </div>
        </div>

        <HappeningNowSidebar events={events} onEventClick={setSelectedEvent} />
      </div>
    </>
  );
}

