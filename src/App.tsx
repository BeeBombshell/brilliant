import { GoogleAuthProvider, useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { GoogleLoginScreen } from "@/components/auth/GoogleLoginScreen";
import Home from "./pages/Home";

function AppContent() {
  const { isAuthenticated, isLoading } = useGoogleAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <GoogleLoginScreen />;
  }

  return (
    <>
      <GoogleCalendarSync />
      <Home />
    </>
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