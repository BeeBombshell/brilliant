import { useAtom } from "jotai";
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { viewAtom, selectedDateAtom, actionHistoryAtom, redoStackAtom } from "@/state/calendarAtoms";
import type { CalendarView } from "@/types/calendar";
import { useCalendarActions } from "@/hooks/useCalendarActions";

const views: CalendarView[] = ["day", "week", "month"];

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
  const [history] = useAtom(actionHistoryAtom);
  const [redoStack] = useAtom(redoStackAtom);
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

  return (
    <Card className="flex h-full flex-col border-none shadow-none">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goPrevious} aria-label="Previous">
              ‹
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext} aria-label="Next">
              ›
            </Button>
          </div>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <div className="text-sm font-medium">{getRangeText(view, selectedDate)}</div>
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
          <div className="flex rounded-md bg-muted p-1 text-xs">
            {views.map(v => (
              <Button
                key={v}
                size="sm"
                variant={v === view ? "secondary" : "ghost"}
                className="px-2"
                onClick={() => changeView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{children}</div>
    </Card>
  );
}

