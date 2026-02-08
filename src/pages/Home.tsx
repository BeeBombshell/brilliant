import { useState } from "react";
import { useAtom } from "jotai";
import { ChatPane } from "@/components/chat/ChatPane";
import { CalendarRoot } from "@/components/calendar/CalendarRoot";
import { Button } from "@/components/ui/button";
import { chatThreadIdAtom } from "@/state/calendarAtoms";
import { IconMessageCircle } from "@tabler/icons-react";

export default function Home() {
  const [showChat, setShowChat] = useState(false);

  const [threadId] = useAtom(chatThreadIdAtom);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground relative">
      {/* Chat Sidebar - Desktop: fixed width, Mobile: Overlay */}
      <div className={`
        fixed inset-y-0 left-0 z-40 flex w-full flex-col border-r bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-in-out md:static md:w-[300px] lg:w-[360px] md:translate-x-0 overflow-hidden
        ${showChat ? "translate-x-0" : "-translate-x-full"}
      `}>
        <ChatPane key={threadId || "default"} onClose={() => setShowChat(false)} />
      </div>

      {/* Main Calendar View */}
      <div className="flex flex-1 flex-col min-w-0">
        <CalendarRoot />
      </div>

      {/* Mobile Chat Toggle Button */}
      {!showChat && (
        <Button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-2xl md:hidden"
          size="icon"
        >
          <IconMessageCircle size={24} />
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
