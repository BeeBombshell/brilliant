import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const minutesInDay = 24 * 60;

export function CalendarWeekView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const [dragState, setDragState] = useState<{
    dayIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);

  const dayOfWeek = selectedDate.getDay();
  const weekStart = addDays(selectedDate, -dayOfWeek);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePointerDown = (dayIndex: number) =>
    ((event: React.PointerEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const y = event.clientY - rect.top + container.scrollTop;
      setDragState({ dayIndex, startY: y, currentY: y });
      container.setPointerCapture(event.pointerId);
    });

  const handlePointerMove =
    (dayIndex: number) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState || dragState.dayIndex !== dayIndex) return;
      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const y = event.clientY - rect.top + container.scrollTop;
      setDragState(current =>
        current ? { ...current, currentY: y } : current
      );
    };

  const handlePointerUp =
    (dayIndex: number, day: Date) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      if (!dragState || dragState.dayIndex !== dayIndex) {
        container.releasePointerCapture(event.pointerId);
        return;
      }

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

      container.releasePointerCapture(event.pointerId);
      setDragState(null);
    };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-14 border-r bg-muted/40 text-right text-xs text-muted-foreground">
        {HOURS.map(hour => (
          <div key={hour} className="h-12 pr-1">
            {hour.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>
      <div className="flex flex-1 overflow-auto">
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
            dragState && dragState.dayIndex === index
              ? {
                  top: Math.min(dragState.startY, dragState.currentY),
                  height: Math.abs(dragState.currentY - dragState.startY),
                }
              : null;

          return (
            <div
              key={day.toISOString()}
              className="relative min-w-[180px] border-r last:border-r-0"
            >
              <div className="sticky top-0 z-10 border-b bg-background px-2 py-1 text-xs font-medium">
                {format(day, "EEE d")}
              </div>
              <div
                className="relative"
                onPointerDown={handlePointerDown(index)}
                onPointerMove={handlePointerMove(index)}
                onPointerUp={handlePointerUp(index, day)}
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
                  const topMinutes =
                    (start.getTime() - dayStart.getTime()) / 60000;
                  const durationMinutes = Math.max(
                    30,
                    (end.getTime() - start.getTime()) / 60000
                  );

                  const topPercent = (topMinutes / minutesInDay) * 100;
                  const heightPercent =
                    (durationMinutes / minutesInDay) * 100;

                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded-md border bg-primary/20 px-2 py-1 text-xs"
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
          );
        })}
      </div>
    </div>
  );
}

