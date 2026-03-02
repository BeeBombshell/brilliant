import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { TamboProvider } from "@tambo-ai/react";

import { eventsAtom, selectedDateAtom, viewAtom } from "@/state/calendarAtoms";
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
  const events = useAtomValue(eventsAtom);
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
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const todayEnd = new Date(todayStart.getTime() + 86400000);

          const todayEvents = events
            .filter((e) => {
              const start = new Date(e.startDate);
              const end = new Date(e.endDate);
              return start < todayEnd && end > todayStart;
            })
            .sort(
              (a, b) =>
                new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime(),
            )
            .slice(0, 10)
            .map((e) => ({
              id: e.id,
              title: e.title,
              startDate: e.startDate,
              endDate: e.endDate,
              color: e.color,
            }));

          return {
            todayEventCount: todayEvents.length,
            todayEvents,
            description:
              todayEvents.length > 0
                ? `The user has ${todayEvents.length} events today: ${todayEvents.map((e) => e.title).join(", ")}`
                : "The user has no events today.",
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
