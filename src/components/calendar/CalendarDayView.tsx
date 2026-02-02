import { parseISO, differenceInMinutes } from "date-fns";
import { useAtom } from "jotai";

import { selectedDateAtom, eventsAtom } from "@/state/calendarAtoms";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarDayView() {
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);

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
      <div className="relative flex-1 overflow-auto">
        <div className="relative min-h-full">
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
    </div>
  );
}

