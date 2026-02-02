import { startOfMonth, endOfMonth, addDays, eachDayOfInterval, parseISO, isSameDay, format } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";

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
                  className="truncate rounded-md bg-primary/10 px-1 py-0.5 text-[0.7rem]"
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

