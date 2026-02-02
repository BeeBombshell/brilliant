import { useAtom } from "jotai";
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CalendarDateIcon } from "@/components/calendar/CalendarDateIcon";
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
      <div className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <CalendarDateIcon date={new Date()} onClick={goToday} />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {format(selectedDate, "MMMM yyyy")}
                </span>
                <Badge variant="outline" className="px-1.5">
                  {events.length} events
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[26px] w-[26px]"
                  onClick={goPrevious}
                  aria-label="Previous"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </Button>
                <p className="text-sm text-muted-foreground">
                  {getRangeText(view, selectedDate)}
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[26px] w-[26px]"
                  onClick={goNext}
                  aria-label="Next"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-14">
            {/* <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button> */}

          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={history.length === 0}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={redoStack.length === 0}
          >
            Redo
          </Button>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="flex items-center gap-1 rounded-md bg-muted p-1">
            <Button
              size="sm"
              variant={view === "day" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => changeView("day")}
              title="Day view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={view === "week" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => changeView("week")}
              title="Week view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="9" y1="10" x2="9" y2="22" />
                <line x1="15" y1="10" x2="15" y2="22" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant={view === "month" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => changeView("month")}
              title="Month view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="9" y1="4" x2="9" y2="22" />
                <line x1="15" y1="4" x2="15" y2="22" />
                <line x1="3" y1="14" x2="21" y2="14" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={createQuickEvent}>
            + Event
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>
    </Card>
  );
}

