import type { CalendarEvent, EventColor } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { IconCircleFilled } from "@tabler/icons-react";

interface EventCardProps {
  event: CalendarEvent;
  style: React.CSSProperties;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  className?: string;
  durationMinutes: number;
}

const dotColorClasses: Record<EventColor, string> = {
  blue: "text-sky-600",
  green: "text-emerald-600",
  red: "text-rose-600",
  yellow: "text-amber-600",
  purple: "text-violet-600",
  orange: "text-orange-600",
  gray: "text-slate-600",
};

export function EventCard({
  event,
  style,
  onClick,
  onPointerDown,
  className,
  durationMinutes,
}: EventCardProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (onPointerDown) {
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
        <IconCircleFilled
          size={8}
          className={cn("shrink-0", dotColorClasses[event.color])}
        />
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
