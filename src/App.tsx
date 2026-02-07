import { useEffect } from "react";
import { useAtom } from "jotai";
import { TamboProvider } from "@tambo-ai/react";

import { eventsAtom } from "@/state/calendarAtoms";
import { tamboTools } from "./lib/tambo/tools";
import { tamboComponents } from "./lib/tambo";
import { GoogleAuthProvider, useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { GoogleLoginScreen } from "@/components/auth/GoogleLoginScreen";
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
  const { user } = useGoogleAuth();
  const tamboUserKey = user?.email ?? "guest";

  return (
    <TamboProvider
      apiKey={import.meta.env.VITE_TAMBO_API_KEY}
      userKey={tamboUserKey}
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
      }}
    >
      <GoogleCalendarSync />
      <Home />
    </TamboProvider>
  );
}
