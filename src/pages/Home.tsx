import { ChatPane } from "@/components/chat/ChatPane";
import { CalendarRoot } from "@/components/calendar/CalendarRoot";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="flex w-1/3 min-w-[280px] max-w-md flex-col border-r bg-muted/30">
        <ChatPane />
      </div>
      <div className="flex flex-1 flex-col">
        <CalendarRoot />
      </div>
    </div>
  );
}
