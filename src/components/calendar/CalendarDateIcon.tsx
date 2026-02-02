import { format } from "date-fns";

interface CalendarDateIconProps {
  date: Date;
  className?: string;
  variant?: "circle" | "page";
  onClick?: () => void;
}

export function CalendarDateIcon({ date, className = "", variant = "page", onClick }: CalendarDateIconProps) {
  const dayNumber = format(date, "d");
  const monthShort = format(date, "MMM").toUpperCase();

  if (variant === "circle") {
    return (
      <div
        className={`flex size-12 flex-col items-center justify-center rounded-full border-2 border-border bg-background p-2 ${className}`}
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center">
          <span className="text-[0.5rem] font-medium leading-none text-muted-foreground">
            {monthShort}
          </span>
          <span className="text-lg font-bold leading-none text-foreground">
            {dayNumber}
          </span>
        </div>
      </div>
    );
  }

  // Page variant - traditional calendar icon
  return (
    <div className={`flex flex-col overflow-hidden rounded-md border ${className}`} onClick={onClick}>
      {/* Calendar header */}
      <div className="bg-primary py-0.5 px-5 text-center">
        <span className="text-[0.6rem] font-bold leading-tight text-primary-foreground">
          {monthShort}
        </span>
      </div>
      {/* Calendar body */}
      <div className="flex size-10 px-5 items-center justify-center bg-background w-full">
        <span className="text-xl font-bold leading-none text-foreground">
          {dayNumber}
        </span>
      </div>
    </div>
  );
}
