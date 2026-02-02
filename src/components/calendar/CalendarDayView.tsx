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

const colorClasses: Record<EventColor, string> = {
  blue: "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
  green: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  red: "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
  yellow: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  purple: "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
  orange: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  gray: "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
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
                  className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${colorClasses[event.color]}`}
                  style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                >
                  <div className="truncate font-semibold">{event.title}</div>
                  {durationMinutes > 25 && event.description && (
                    <div className="mt-0.5 line-clamp-2 text-[0.7rem] opacity-80">
                      {event.description}
                    </div>
                  )}
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

