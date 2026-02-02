import { addDays, format, parseISO } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarWeekView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);

  const dayOfWeek = selectedDate.getDay();
  const weekStart = addDays(selectedDate, -dayOfWeek);

  const days = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i)
  );

  const minutesInDay = 24 * 60;

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
        {days.map(day => {
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

          return (
            <div
              key={day.toISOString()}
              className="relative min-w-[180px] border-r last:border-r-0"
            >
              <div className="sticky top-0 z-10 border-b bg-background px-2 py-1 text-xs font-medium">
                {format(day, "EEE d")}
              </div>
              <div className="relative">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="border-b border-border/60"
                    style={{ height: "3rem" }}
                  />
                ))}

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
                      className="absolute left-1 right-1 rounded-md border bg-primary/10 px-2 py-1 text-xs"
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

