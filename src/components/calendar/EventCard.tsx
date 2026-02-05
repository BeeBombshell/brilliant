import type { CalendarEvent, EventColor } from "@/types/calendar";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: CalendarEvent;
  style: React.CSSProperties;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  isDraggable?: boolean;
  className?: string;
  durationMinutes: number;
}

const dotColorClasses: Record<EventColor, string> = {
  blue: "fill-sky-600",
  green: "fill-emerald-600",
  red: "fill-rose-600",
  yellow: "fill-amber-600",
  purple: "fill-violet-600",
  orange: "fill-orange-600",
  gray: "fill-slate-600",
};

export function EventCard({
  event,
  style,
  onClick,
  onPointerDown,
  isDraggable = false,
  className,
  durationMinutes,
}: EventCardProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isDraggable && onPointerDown) {
      e.stopPropagation();
      onPointerDown(e);
    }
  };

  return (
    <button
      onClick={onClick}
      onPointerDown={handlePointerDown}
      className={cn(
        "absolute flex left-1 right-1 overflow-hidden rounded-md border border-border bg-muted/50 px-2 pt-1 pb-2 text-left text-xs text-foreground transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      style={style}
    >
      <div className="flex items-start gap-1.5 mt-2">
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={cn("shrink-0", dotColorClasses[event.color])}
        >
          <circle cx="4" cy="4" r="4" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">{event.title}</div>
          {durationMinutes > 25 && event.description && (
            <div className="mt-0.5 line-clamp-2 text-[0.7rem] leading-tight text-muted-foreground">
              {event.description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
