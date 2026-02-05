import { useState, useMemo } from "react";
import { startOfMonth, addDays, parseISO, format, isToday, startOfWeek, startOfDay, endOfDay } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import { MultiDayEventBadge } from "@/components/calendar/MultiDayEventBadge";
import { calculateMonthEventSlots, getMultiDayPosition } from "@/lib/eventLayoutUtils";
import type { CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { useCalendarActions } from "@/hooks/useCalendarActions";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonthView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { changeView, changeDate } = useCalendarActions();

  const monthStart = startOfMonth(selectedDate);
  // const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);

  // Generate 6 weeks (42 days) for consistent grid
  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));

  // Calculate event slot positions for the month
  const eventPositions = useMemo(() => calculateMonthEventSlots(events, selectedDate), [events, selectedDate]);

  const eventsForDay = (day: Date) => {
    const dayStartTime = startOfDay(day);
    const dayEndTime = endOfDay(day);

    return events
      .filter(event => {
        const start = parseISO(event.startDate);
        const end = parseISO(event.endDate);
        // Event overlaps with this day
        return start <= dayEndTime && end >= dayStartTime;
      })
      .map(event => ({
        ...event,
        position: getMultiDayPosition(event, day),
        slot: eventPositions[event.id] ?? -1,
      }))
      .filter(event => event.slot !== -1) // Only show events with assigned slots
      .sort((a, b) => a.slot - b.slot);
  };

  const handleDayClick = (day: Date) => {
    changeDate(day);
    changeView("day");
  };

  return (
    <>
      <EventDetailsDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
      <div className="h-full">
        {/* Week day headers */}
        <div className="grid grid-cols-7 divide-x border-b">
          {WEEK_DAYS.map(day => (
            <div key={day} className="flex items-center justify-center py-2">
              <span className="text-xs font-medium text-muted-foreground">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid h-[calc(100%-40px)] grid-cols-7">
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const inMonth = day.getMonth() === selectedDate.getMonth();
            const isSunday = day.getDay() === 0;
            const dayEvents = eventsForDay(day).slice(0, 3);
            const extraCount = Math.max(
              0,
              eventsForDay(day).length - dayEvents.length
            );

            return (
              <div
                key={dayKey}
                className={cn(
                  "flex min-h-[110px] flex-col gap-1 border-b border-l py-1.5",
                  isSunday && "border-l-0",
                  !inMonth && "bg-muted/30"
                )}
              >
                {/* Day number button */}
                <button
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "flex size-6 translate-x-1 items-center justify-center rounded-full text-xs font-semibold hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    !inMonth && "opacity-40",
                    isToday(day) && "bg-primary font-bold text-primary-foreground hover:bg-primary"
                  )}
                >
                  {format(day, "d")}
                </button>

                {/* Events */}
                <div className={cn("flex flex-col gap-1", !inMonth && "opacity-50")}>
                  {dayEvents.map(event => (
                    <MultiDayEventBadge
                      key={`${event.id}-${dayKey}`}
                      event={event}
                      position={event.position}
                      onClick={() => setSelectedEvent(event)}
                      className="text-[0.7rem]"
                    />
                  ))}
                  {extraCount > 0 && (
                    <button
                      onClick={() => handleDayClick(day)}
                      className="w-full rounded-md px-1 py-0.5 text-left text-[0.7rem] font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      +{extraCount} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

