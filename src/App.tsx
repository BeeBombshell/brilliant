import { useEffect } from "react";
import { useAtom } from "jotai";
import { TamboProvider, useTamboThread } from "@tambo-ai/react";

import { eventsAtom, chatThreadIdAtom } from "@/state/calendarAtoms";
import { tamboTools } from "./lib/tambo/tools";
import { tamboComponents } from "./lib/tambo";
import { GoogleAuthProvider, useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { GoogleLoginScreen } from "@/components/auth/GoogleLoginScreen";
import Home from "./pages/Home";


function ThreadManager() {
  const [threadId, setThreadId] = useAtom(chatThreadIdAtom);
  const { currentThreadId } = useTamboThread();

  // Sync Tambo's current thread ID to our atom (one-way sync)
  // This ensures our UI state reflects Tambo's state
  useEffect(() => {
    if (currentThreadId && currentThreadId !== threadId) {
      setThreadId(currentThreadId);
    }
  }, [currentThreadId, threadId, setThreadId]);

  return null;
}

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

  return (
    <TamboProvider
      apiKey={import.meta.env.VITE_TAMBO_API_KEY}
      components={tamboComponents}
      tools={tamboTools}
      contextHelpers={{
        userTimeContext: () => ({
          nowIso: new Date().toISOString(),
          nowLocal: new Date().toLocaleString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }}
    >
      <ThreadManager />
      <GoogleCalendarSync />
      <Home />
    </TamboProvider>
  );
}

export function App() {
  return (
    <GoogleAuthProvider>
      <AppContent />
    </GoogleAuthProvider>
  );
}

export default App;
