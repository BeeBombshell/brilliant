import { useState } from "react";
import { startOfMonth, endOfMonth, addDays, parseISO, isSameDay, format, isToday, startOfWeek } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import type { EventColor, CalendarEvent } from "@/types/calendar";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const colorPillClasses: Record<EventColor, string> = {
  blue: "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
  green: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  red: "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
  yellow: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  purple: "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
  orange: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  gray: "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export function CalendarMonthView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);

  // Generate 6 weeks (42 days) for consistent grid
  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));

  const eventsForDay = (day: Date) =>
    events.filter(event =>
      isSameDay(parseISO(event.startDate), day)
    );

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
          {days.map((day, index) => {
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
                    <div
                      key={event.id}
                      className={cn(
                        "truncate rounded-md px-2 py-0.5 text-[0.7rem] font-semibold",
                        colorPillClasses[event.color]
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div className="px-1 text-[0.7rem] font-semibold text-muted-foreground">
                      +{extraCount} more
                    </div>
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

