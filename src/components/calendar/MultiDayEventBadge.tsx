import { format, parseISO } from "date-fns";
import type { CalendarEvent, MultiDayPosition } from "@/types/calendar";
import { cn } from "@/lib/utils";

interface MultiDayEventBadgeProps {
  event: CalendarEvent;
  position: MultiDayPosition;
  onClick?: () => void;
  variant?: "week" | "month";
  className?: string;
}

const positionStyles: Record<MultiDayPosition, string> = {
  first: "rounded-r-none border-r-0 mr-0",
  middle: "rounded-none border-x-0 mx-0",
  last: "rounded-l-none border-l-0 ml-0",
  none: "",
};

const colorStyles: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  gray: "border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
};

const dotColorClasses: Record<string, string> = {
  blue: "fill-blue-600",
  green: "fill-emerald-600",
  red: "fill-rose-600",
  yellow: "fill-amber-600",
  purple: "fill-violet-600",
  orange: "fill-orange-600",
  gray: "fill-slate-600",
};

export function MultiDayEventBadge({
  event,
  position,
  onClick,
  className,
}: MultiDayEventBadgeProps) {
  const showTitle = position === "first" || position === "none";
  const showTime = position === "first" || position === "none";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-6.5 select-none items-center justify-between gap-1.5 truncate whitespace-nowrap rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mx-1",
        colorStyles[event.color] || colorStyles.gray,
        positionStyles[position],
        className
      )}
    >
      <div className="flex items-center gap-1.5 truncate">
        {showTitle && (
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className={cn("shrink-0", dotColorClasses[event.color] || dotColorClasses.gray)}
          >
            <circle cx="4" cy="4" r="4" />
          </svg>
        )}
        {showTitle && <span className="truncate font-semibold">{event.title}</span>}
      </div>
      {showTime && (
        <span className="text-xs">
          {format(parseISO(event.startDate), "h:mm a")}
        </span>
      )}
    </button>
  );
}
