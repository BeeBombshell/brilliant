import { startOfMonth, endOfMonth, addDays, eachDayOfInterval, parseISO, isSameDay, format } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";
import type { EventColor } from "@/types/calendar";

const colorPillClasses: Record<EventColor, string> = {
  blue: "bg-blue-500/15 text-blue-900 dark:text-blue-100",
  green: "bg-green-500/15 text-green-900 dark:text-green-100",
  red: "bg-red-500/15 text-red-900 dark:text-red-100",
  yellow: "bg-yellow-400/20 text-yellow-900 dark:text-yellow-100",
  purple: "bg-purple-500/15 text-purple-900 dark:text-purple-100",
  orange: "bg-orange-500/15 text-orange-900 dark:text-orange-100",
  gray: "bg-neutral-400/15 text-neutral-900 dark:text-neutral-100",
};

export function CalendarMonthView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const days = eachDayOfInterval({
    start: monthStart,
    end: addDays(monthEnd, (7 - ((monthEnd.getDay() + 1) % 7)) % 7),
  });

  const eventsForDay = (day: Date) =>
    events.filter(event =>
      isSameDay(parseISO(event.startDate), day)
    );

  return (
    <div className="grid h-full grid-cols-7 border-t text-xs">
      {days.map(day => {
        const inMonth = day.getMonth() === selectedDate.getMonth();
        const dayEvents = eventsForDay(day).slice(0, 3);
        const extraCount = Math.max(
          0,
          eventsForDay(day).length - dayEvents.length
        );

        return (
          <div
            key={day.toISOString()}
            className={`flex min-h-[110px] flex-col border-b border-r p-1 ${
              inMonth ? "bg-background" : "bg-muted/40"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[0.7rem] font-medium">
                {format(day, "d")}
              </span>
            </div>
            <div className="space-y-0.5">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className={`truncate rounded-md px-1 py-0.5 text-[0.7rem] ${colorPillClasses[event.color]}`}
                >
                  {event.title}
                </div>
              ))}
              {extraCount > 0 && (
                <div className="text-[0.7rem] text-muted-foreground">
                  +{extraCount} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

