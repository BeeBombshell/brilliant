import { useMemo } from "react";
import { useAtom } from "jotai";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { actionLogAtom, selectedDateAtom, newEventDraftAtom } from "@/state/calendarAtoms";
// import { useCalendarActions } from "@/hooks/useCalendarActions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const mockMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: "Tell me what you want to get done this week and I’ll build a schedule.",
  },
  {
    id: "2",
    role: "user",
    content: "I want 3 deep work blocks and time for emails & meetings.",
  },
];

export function ChatPane() {
  const [actionLog] = useAtom(actionLogAtom);
  const [, setSelectedDate] = useAtom(selectedDateAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);
  // const { addEvent } = useCalendarActions();

  const orderedMessages = useMemo(() => mockMessages, []);

  return (
    <Card className="flex h-full flex-col border-l-0 border-t-0 rounded-none bg-card/80 shadow-none">
      <div className="border-b px-4 py-3 text-sm font-semibold">
        Brilliant Planner
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex-1 overflow-hidden rounded-md border bg-background/80">
          <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
            <div className="space-y-3 text-sm leading-relaxed">
              {orderedMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="space-y-2 bg-background/80 p-3">
          <div className="text-[0.7rem] font-medium uppercase text-muted-foreground">
            Recent changes
          </div>
          <div className="max-h-24 space-y-1 overflow-y-auto text-xs">
            {actionLog.length === 0 && (
              <div className="text-muted-foreground">
                Actions you take in the calendar will show up here.
              </div>
            )}
            {actionLog.map((item, index) => (
              <div key={index} className="text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <form
          className="space-y-2"
          onSubmit={event => {
            event.preventDefault();
            const now = new Date();
            setSelectedDate(now);
            const start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              now.getHours(),
              0,
              0,
              0
            );
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            setDraft({
              startDate: start.toISOString(),
              endDate: end.toISOString(),
            });
          }}
        >
          <Textarea
            rows={3}
            placeholder="Describe your goals, constraints, or preferences..."
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Ask AI to schedule
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

