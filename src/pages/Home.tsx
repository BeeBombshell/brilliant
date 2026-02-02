import { ChatPane } from "@/components/chat/ChatPane";
import { CalendarRoot } from "@/components/calendar/CalendarRoot";

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 flex-col">
        <CalendarRoot />
      </div>
      <div className="flex w-[260px] md:w-[300px] lg:w-[340px] flex-col border-r bg-muted/30">
        <ChatPane />
      </div>
    </div>
  );
}
