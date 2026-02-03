import { useState } from "react";
import { startOfMonth, addDays, parseISO, isSameDay, format, isToday, startOfWeek } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import type { EventColor, CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { useCalendarActions } from "@/hooks/useCalendarActions";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const eventsForDay = (day: Date) =>
    events.filter(event =>
      isSameDay(parseISO(event.startDate), day)
    );

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
            const inMonth = day.getMonth() === selectedDate.getMonth();
            const isSunday = day.getDay() === 0;
            const dayEvents = eventsForDay(day).slice(0, 3);
            const extraCount = Math.max(
              0,
              eventsForDay(day).length - dayEvents.length
            );

            return (
              <div
                key={day.toISOString()}
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
                <div className={cn("space-y-1 px-1", !inMonth && "opacity-50")}>
                  {dayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-left text-[0.7rem] font-semibold text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <svg width="6" height="6" viewBox="0 0 6 6" className={`shrink-0 ${dotColorClasses[event.color]}`}>
                        <circle cx="3" cy="3" r="3" />
                      </svg>
                      <span className="truncate">{event.title}</span>
                    </button>
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

