import { useAtom } from "jotai";

import { CalendarShell } from "@/components/calendar/CalendarShell";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { NewEventDialog } from "@/components/calendar/NewEventDialog";
import { viewAtom } from "@/state/calendarAtoms";

export function CalendarRoot() {
  const [view] = useAtom(viewAtom);

  return (
    <div className="flex h-full flex-col">
      <CalendarShell>
        {view === "day" && <CalendarDayView />}
        {view === "week" && <CalendarWeekView />}
        {view === "month" && <CalendarMonthView />}
      </CalendarShell>
      <NewEventDialog />
    </div>
  );
}

