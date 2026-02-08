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
        className={`flex size-10 flex-col items-center justify-center rounded-full border-2 border-border bg-background p-1.5 ${className}`}
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center">
          <span className="text-[0.45rem] font-medium leading-none text-muted-foreground">
            {monthShort}
          </span>
          <span className="text-base font-bold leading-none text-foreground">
            {dayNumber}
          </span>
        </div>
      </div>
    );
  }

  // Page variant - traditional calendar icon
  return (
    <div className={`flex size-10 flex-col overflow-hidden rounded-md border shrink-0 ${className} cursor-pointer hover:border-primary/50 transition-colors`} onClick={onClick}>
      {/* Calendar header */}
      <div className="bg-primary/10 py-1 px-1 text-center border-b border-primary/10 shrink-0">
        <span className="text-[0.55rem] font-bold leading-none text-primary block">
          {monthShort}
        </span>
      </div>
      {/* Calendar body */}
      <div className="flex flex-1 items-center justify-center bg-background">
        <span className="text-base font-bold leading-none text-foreground">
          {dayNumber}
        </span>
      </div>
    </div>
  );
}
