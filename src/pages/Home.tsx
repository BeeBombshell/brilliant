import { useState } from "react";
import { useAtom } from "jotai";
import { ChatPane } from "@/components/chat/ChatPane";
import { CalendarRoot } from "@/components/calendar/CalendarRoot";
import { Button } from "@/components/ui/button";
import { chatThreadIdAtom } from "@/state/calendarAtoms";

export default function Home() {
  const [showChat, setShowChat] = useState(false);

  const [threadId] = useAtom(chatThreadIdAtom);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground relative">
      {/* Main Calendar View */}
      <div className="flex flex-1 flex-col min-w-0">
        <CalendarRoot />
      </div>

      {/* Chat Sidebar - Desktop: fixed width, Mobile: Overlay */}
      <div className={`
        fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-in-out md:static md:w-[300px] lg:w-[360px] md:translate-x-0 overflow-hidden
        ${showChat ? "translate-x-0" : "translate-x-full"}
      `}>
        <ChatPane key={threadId || "default"} onClose={() => setShowChat(false)} />
      </div>

      {/* Mobile Chat Toggle Button */}
      {!showChat && (
        <Button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-2xl md:hidden"
          size="icon"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </Button>
      )}

      {/* Overlay for mobile when chat is open */}
      {showChat && (
        <div
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
