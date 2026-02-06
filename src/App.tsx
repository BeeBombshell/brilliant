import { useEffect } from "react";
import { useAtom } from "jotai";
import { TamboProvider } from "@tambo-ai/react";

import { eventsAtom, chatThreadIdAtom } from "@/state/calendarAtoms";
import { tamboComponents, tamboTools } from './lib/tambo-config';
import { GoogleAuthProvider, useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { GoogleLoginScreen } from "@/components/auth/GoogleLoginScreen";
import Home from "./pages/Home";



function AppContent() {
  const { isAuthenticated, isLoading } = useGoogleAuth();

  const [, setEvents] = useAtom(eventsAtom);
  const [threadId] = useAtom(chatThreadIdAtom);

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
      threadId={threadId || undefined}
    >
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