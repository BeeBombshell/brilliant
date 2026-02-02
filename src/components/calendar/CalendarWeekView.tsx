import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom, newEventDraftAtom } from "@/state/calendarAtoms";
import type { EventColor } from "@/types/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const minutesInDay = 24 * 60;
const HOUR_HEIGHT = 96; // 96px per hour (Big Calendar standard)

const colorClasses: Record<EventColor, string> = {
  blue: "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  green: "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  red: "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  yellow: "border border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  purple: "border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  orange: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  gray: "border border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
};

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
              dragState && dragState.dayIndex === index
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
                        className={`absolute left-1 right-1 rounded-md px-2 py-1.5 text-xs ${colorClasses[event.color]}`}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                        }}
                      >
                        <div className="font-semibold">{event.title}</div>
                        {durationMinutes > 25 && event.description && (
                          <div className="mt-0.5 text-[0.7rem] opacity-80">
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
    </div>
  );
}

