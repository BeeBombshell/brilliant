import { useState } from "react";
import { parseISO, differenceInMinutes } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";
import type { EventColor } from "@/types/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const minutesInDay = 24 * 60;

const colorClasses: Record<EventColor, string> = {
  blue: "border-blue-500/50 bg-blue-500/15",
  green: "border-green-500/50 bg-green-500/15",
  red: "border-red-500/50 bg-red-500/15",
  yellow: "border-yellow-400/60 bg-yellow-400/15",
  purple: "border-purple-500/50 bg-purple-500/15",
  orange: "border-orange-500/50 bg-orange-500/15",
  gray: "border-neutral-400/60 bg-neutral-400/15",
};

export function CalendarDayView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null);

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
    <div className="flex h-full overflow-hidden">
      <div className="w-14 border-r bg-muted/40 text-right text-xs text-muted-foreground">
        {HOURS.map(hour => (
          <div key={hour} className="h-12 pr-1">
            {hour.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>
      <div className="relative flex-1 overflow-auto">
        <div
          className="relative min-h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {HOURS.map(hour => (
            <div
              key={hour}
              className="border-b border-border/60"
              style={{ height: "3rem" }}
            />
          ))}

          {dragOverlay && (
            <div
              className="pointer-events-none absolute left-1 right-1 rounded-md bg-primary/20"
              style={{
                top: dragOverlay.top,
                height: dragOverlay.height,
              }}
            />
          )}

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
              <div
                key={event.id}
                className={`absolute left-1 right-1 rounded-md px-2 py-1 text-xs ${colorClasses[event.color]}`}
                style={{
                  top: `${topPercent}%`,
                  height: `${heightPercent}%`,
                }}
              >
                <div className="font-medium">{event.title}</div>
                {event.description && (
                  <div className="text-[0.7rem] text-muted-foreground">
                    {event.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

