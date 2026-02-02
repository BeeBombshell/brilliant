import { startOfMonth, endOfMonth, addDays, eachDayOfInterval, parseISO, isSameDay, format, isToday, startOfWeek } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";
import type { EventColor } from "@/types/calendar";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const colorPillClasses: Record<EventColor, string> = {
  blue: "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  green: "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  red: "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  yellow: "border border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  purple: "border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  orange: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  gray: "border border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
};

export function CalendarMonthView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);

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
  );
}

