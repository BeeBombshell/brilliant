import { useState, useEffect } from "react";
import { parseISO, format, isWithinInterval } from "date-fns";
import type { CalendarEvent } from "@/types/calendar";

interface HappeningNowSidebarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const colorClasses: Record<string, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  yellow: "bg-amber-500",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
  gray: "bg-slate-500",
};

export function HappeningNowSidebar({ events, onEventClick }: HappeningNowSidebarProps) {
  const [now, setNow] = useState(new Date());

  // Update current time every 30 seconds to refresh "happening now" status
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const currentEvents = events.filter(event => {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    return isWithinInterval(now, { start, end });
  });

  const upcomingEvents = events
    .filter(event => {
      const start = parseISO(event.startDate);
      return start > now;
    })
    .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())
    .slice(0, 3);

  return (
    <div className="hidden w-72 flex-col border-l bg-muted/20 lg:flex">
      {/* Happening Now Section */}
      <div className="border-b p-4">
        <div className="mb-3 flex items-center gap-2">
          {currentEvents.length > 0 ? (
            <>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green-600" />
              </span>
              <h3 className="text-sm font-semibold">Happening Now</h3>
            </>
          ) : (
            <>
              <div className="size-2.5 rounded-full bg-muted-foreground/30" />
              <h3 className="text-sm font-semibold text-muted-foreground">No Current Events</h3>
            </>
          )}
        </div>

        {currentEvents.length > 0 ? (
          <div className="space-y-3">
            {currentEvents.map(event => {
              const start = parseISO(event.startDate);
              const end = parseISO(event.endDate);

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full space-y-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 size-2 shrink-0 rounded-full ${colorClasses[event.color]}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-tight">{event.title}</p>
                      {event.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>
                          {format(start, "h:mm a")} - {format(end, "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs italic text-muted-foreground">
            No events currently in progress
          </p>
        )}
      </div>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <div className="flex-1 overflow-auto p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Coming Up</h3>
          <div className="space-y-2">
            {upcomingEvents.map(event => {
              const start = parseISO(event.startDate);

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="w-full space-y-1 rounded-md border bg-card p-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 size-1.5 shrink-0 rounded-full ${colorClasses[event.color]}`} />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-medium leading-tight">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(start, "h:mm a")}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
