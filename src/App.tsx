import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { TamboProvider } from "@tambo-ai/react";

import { eventsAtom, selectedDateAtom, viewAtom } from "@/state/calendarAtoms";
import { tamboTools } from "./lib/tambo/tools";
import { tamboComponents } from "./lib/tambo";
import { GoogleAuthProvider, useGoogleAuth } from "@/contexts/GoogleAuthContext";
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
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
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
  const selectedDate = useAtomValue(selectedDateAtom);
  const view = useAtomValue(viewAtom);

  return (
    <TamboProvider
      apiKey={import.meta.env.VITE_TAMBO_API_KEY}
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
          let rangeDescription = "";
          if (view === "day") {
            rangeDescription = `looking at ${format(selectedDate, "PPPP")}`;
          } else if (view === "week") {
            const start = startOfWeek(selectedDate);
            const end = endOfWeek(selectedDate);
            rangeDescription = `looking at the week of ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
          } else if (view === "month") {
            rangeDescription = `looking at ${format(selectedDate, "MMMM yyyy")}`;
          }

          return {
            selectedDate: selectedDate.toISOString(),
            viewType: view,
            description: `The user is currently ${rangeDescription} in their calendar. Use this as the default time range if the user refers to "this week", "today", "this month", or "what I'm looking at".`,
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
