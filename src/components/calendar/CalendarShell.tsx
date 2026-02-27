import { useAtom } from "jotai";
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format } from "date-fns";
import {
  IconChevronLeft,
  IconChevronRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconPlus,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarDateIcon } from "@/components/calendar/CalendarDateIcon";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  viewAtom,
  selectedDateAtom,
  actionHistoryAtom,
  redoStackAtom,
  newEventDraftAtom,
  eventsAtom,
} from "@/state/calendarAtoms";
import type { CalendarView } from "@/types/calendar";
import { useCalendarActions } from "@/hooks/useCalendarActions";



function getRangeText(view: CalendarView, date: Date) {
  const fmt = "MMM d, yyyy";
  if (view === "day") return format(date, fmt);
  if (view === "week") {
    const start = subDays(date, date.getDay());
    const end = addDays(start, 6);
    return `${format(start, fmt)} - ${format(end, fmt)}`;
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${format(start, fmt)} - ${format(end, fmt)}`;
}

function getRangeTextShort(view: CalendarView, date: Date) {
  if (view === "day") return format(date, "MMM d");
  if (view === "week") {
    const start = subDays(date, date.getDay());
    const end = addDays(start, 6);
    return `${format(start, "MMM d")} – ${format(end, "d")}`;
  }
  return format(date, "MMM yyyy");
}

export function CalendarShell({ children }: { children: React.ReactNode }) {
  const [view] = useAtom(viewAtom);
  const [selectedDate] = useAtom(selectedDateAtom);
  const [events] = useAtom(eventsAtom);
  const [history] = useAtom(actionHistoryAtom);
  const [redoStack] = useAtom(redoStackAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  const { changeView, changeDate, undo, redo } = useCalendarActions();

  const goToday = () => changeDate(new Date());

  const goPrevious = () => {
    const current = selectedDate;
    const next =
      view === "day"
        ? subDays(current, 1)
        : view === "week"
          ? subWeeks(current, 1)
          : subMonths(current, 1);
    changeDate(next);
  };

  const goNext = () => {
    const current = selectedDate;
    const next =
      view === "day"
        ? addDays(current, 1)
        : view === "week"
          ? addWeeks(current, 1)
          : addMonths(current, 1);
    changeDate(next);
  };

  const createQuickEvent = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  };

  return (
    <Card className="flex h-full flex-col border-none shadow-none">
      {/* ===== TOOLBAR ===== */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 sm:px-4 h-[52px] sm:h-[60px]">
        {/* Left group: date icon + month/range + nav arrows */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Date icon - acts as "Today" button */}
          <CalendarDateIcon date={new Date()} onClick={goToday} />

          {/* Month + range info */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-semibold truncate">
                {format(selectedDate, "MMMM yyyy")}
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex px-1.5 h-5 text-[10px] shrink-0">
                {events.length} events
              </Badge>
            </div>
            {/* Range text - show short version on mobile, full on desktop */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-[18px] w-[18px] rounded-md shrink-0"
                onClick={goPrevious}
                aria-label="Previous"
              >
                <IconChevronLeft size={12} />
              </Button>
              <p className="text-xs text-muted-foreground truncate">
                <span className="hidden sm:inline">{getRangeText(view, selectedDate)}</span>
                <span className="sm:hidden">{getRangeTextShort(view, selectedDate)}</span>
              </p>
              <Button
                variant="outline"
                size="icon"
                className="h-[18px] w-[18px] rounded-md shrink-0"
                onClick={goNext}
                aria-label="Next"
              >
                <IconChevronRight size={12} />
              </Button>
            </div>
          </div>
        </div>

        {/* Right group: actions + view switcher + user */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick event button */}
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 sm:h-8 sm:w-auto sm:px-3 sm:gap-1.5"
            onClick={createQuickEvent}
          >
            <IconPlus size={16} />
            <span className="hidden sm:inline text-sm">Event</span>
          </Button>

          {/* Undo/Redo */}
          <div className="hidden sm:flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
              onClick={undo}
              disabled={history.length === 0}
              title="Undo (Ctrl+Z)"
            >
              <IconArrowBackUp size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted"
              onClick={redo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
            >
              <IconArrowForwardUp size={18} />
            </Button>
          </div>

          {/* View switcher - compact on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 rounded-xl bg-muted/40 border border-border/40 p-0.5 sm:p-1">
            <Button
              size="sm"
              variant={view === "day" ? "secondary" : "ghost"}
              className={`h-6 sm:h-7 px-2 sm:px-3 text-[11px] sm:text-xs font-medium transition-all ${view === "day" ? "shadow-sm bg-background hover:bg-background" : "hover:bg-transparent hover:text-foreground/80 text-muted-foreground"}`}
              onClick={() => changeView("day")}
            >
              Day
            </Button>
            <Button
              size="sm"
              variant={view === "week" ? "secondary" : "ghost"}
              className={`h-6 sm:h-7 px-2 sm:px-3 text-[11px] sm:text-xs font-medium transition-all ${view === "week" ? "shadow-sm bg-background hover:bg-background" : "hover:bg-transparent hover:text-foreground/80 text-muted-foreground"}`}
              onClick={() => changeView("week")}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={view === "month" ? "secondary" : "ghost"}
              className={`h-6 sm:h-7 px-2 sm:px-3 text-[11px] sm:text-xs font-medium transition-all ${view === "month" ? "shadow-sm bg-background hover:bg-background" : "hover:bg-transparent hover:text-foreground/80 text-muted-foreground"}`}
              onClick={() => changeView("month")}
            >
              Month
            </Button>
          </div>

          {/* User menu */}
          <UserMenu />
        </div>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>
    </Card>
  );
}

