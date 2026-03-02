import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { TamboProvider } from "@tambo-ai/react";

import {
  eventsAtom,
  selectedDateAtom,
  viewAtom,
  expandedEventsAtom,
} from "@/state/calendarAtoms";
import { tamboTools } from "./lib/tambo/tools";
import { tamboComponents } from "./lib/tambo";
import {
  GoogleAuthProvider,
  useGoogleAuth,
} from "@/contexts/GoogleAuthContext";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { GoogleLoginScreen } from "@/components/auth/GoogleLoginScreen";
import { SessionExpiredDialog } from "@/components/auth/SessionExpiredDialog";
import Home from "./pages/Home";

function AppContent() {
  const { isAuthenticated, isLoading } = useGoogleAuth();

  const [, setEvents] = useAtom(eventsAtom);

  useEffect(() => {
    if (!isAuthenticated) {
      setEvents([]);
    }
  }, [isAuthenticated, setEvents]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GoogleLoginScreen />;
  }

  return <AppWithTambo />;
}

export function App() {
  return (
    <GoogleAuthProvider>
      <AppContent />
    </GoogleAuthProvider>
  );
}

export default App;

function AppWithTambo() {
  const { user } = useGoogleAuth();
  const expandedEvents = useAtomValue(expandedEventsAtom);
  const selectedDate = useAtomValue(selectedDateAtom);
  const view = useAtomValue(viewAtom);

  return (
    <TamboProvider
      apiKey={import.meta.env.VITE_TAMBO_API_KEY}
      userKey={user?.email || "guest"}
      autoGenerateThreadName={true}
      autoGenerateNameThreshold={3}
      components={tamboComponents}
      tools={tamboTools}
      contextHelpers={{
        userTimeContext: () => ({
          nowIso: new Date().toISOString(),
          nowLocal: new Date().toLocaleString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        calendarViewContext: () => {
          const weekOpts = { weekStartsOn: 0 as const };

          let rangeDescription: string;
          switch (view) {
            case "day":
              rangeDescription = `looking at ${format(selectedDate, "PPPP")}`;
              break;
            case "week": {
              const start = startOfWeek(selectedDate, weekOpts);
              const end = endOfWeek(selectedDate, weekOpts);
              rangeDescription = `looking at the week of ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
              break;
            }
            case "month":
              rangeDescription = `looking at ${format(selectedDate, "MMMM yyyy")}`;
              break;
            default:
              rangeDescription = `looking at ${format(selectedDate, "PPPP")}`;
          }

          return {
            selectedDate: selectedDate.toISOString(),
            viewType: view,
            description: `The user is currently ${rangeDescription} in their calendar. Use this as the default time range if the user refers to "this week", "today", "this month", or "what I'm looking at".`,
          };
        },
        upcomingEventsContext: () => {
          const now = new Date();

          // expandedEventsAtom includes padding (e.g. ±7 days for week view),
          // so filter down to the exact view range before sending to AI
          const weekOpts2 = { weekStartsOn: 0 as const };
          let viewStart: Date;
          let viewEnd: Date;
          switch (view) {
            case "week":
              viewStart = startOfWeek(selectedDate, weekOpts2);
              viewEnd = endOfWeek(selectedDate, weekOpts2);
              viewEnd = new Date(viewEnd.getTime() + 86400000 - 1); // end of day
              break;
            case "month":
              viewStart = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                1,
              );
              viewEnd = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1,
                0,
                23,
                59,
                59,
              );
              break;
            default: // day
              viewStart = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
              );
              viewEnd = new Date(viewStart.getTime() + 86400000 - 1);
          }

          const visibleEvents = expandedEvents
            .filter((e) => {
              const s = new Date(e.startDate);
              const d = new Date(e.endDate);
              return s <= viewEnd && d >= viewStart;
            })
            .slice(0, 30)
            .map((e) => ({
              id: e.id,
              title: e.title,
              startDate: e.startDate,
              endDate: e.endDate,
              color: e.color,
              description: e.description,
              location: e.location,
            }));

          return {
            eventCount: visibleEvents.length,
            visibleEvents,
            currentTime: now.toISOString(),
            description:
              visibleEvents.length > 0
                ? `There are ${visibleEvents.length} events visible on the calendar: ${visibleEvents.map((e) => `"${e.title}" (id: ${e.id})`).join(", ")}. Use the event IDs with calendar tools to update or delete events.`
                : "No events visible on the current calendar view.",
          };
        },
      }}
    >
      <GoogleCalendarSync />
      <SessionExpiredDialog />
      <Home />
    </TamboProvider>
  );
}
