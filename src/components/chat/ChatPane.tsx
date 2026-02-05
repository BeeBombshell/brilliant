import { useMemo, useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { actionLogAtom, selectedDateAtom, newEventDraftAtom } from "@/state/calendarAtoms";

import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPaneProps {
  onClose?: () => void;
}

export function ChatPane({ onClose }: ChatPaneProps) {
  const { user, logout } = useGoogleAuth();
  const [actionLog] = useAtom(actionLogAtom);
  const [, setSelectedDate] = useAtom(selectedDateAtom);
  const [, setDraft] = useAtom(newEventDraftAtom);

  // Tambo AI hooks
  const { thread } = useTamboThread();
  const { value, setValue, submit, isPending } = useTamboThreadInput();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Combine mock messages with real Tambo thread messages
  const orderedMessages = useMemo<ChatMessage[]>(() => {
    const mockMessages: ChatMessage[] = [
      {
        id: "1",
        role: "assistant",
        content: "Tell me what you want to get done this week and I'll build a schedule.",
      },
    ];

    // Add messages from Tambo thread if available
    const tamboMessages: ChatMessage[] = thread?.messages?.map(msg => {
      let contentString = "";
      if (typeof msg.content === "string") {
        contentString = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentString = msg.content
          .map(part => ("text" in part && typeof (part as any).text === "string" ? (part as any).text : ""))
          .join("");
      }

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: contentString || "",
      };
    }) || [];

    return [...mockMessages, ...tamboMessages];
  }, [thread?.messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orderedMessages, isPending]);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!value.trim() || isPending) return;

    // Start submission
    const submitPromise = submit({ streamResponse: true });

    // Clear input immediately for better UX
    setValue("");

    // Wait for the submission to complete (including streaming)
    await submitPromise;

    // Keep existing calendar draft logic
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
  };

  return (
    <Card className="flex h-full flex-col border-l-0 border-t-0 rounded-none bg-card/80 shadow-none">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Brilliant Planner</span>
        {onClose && (
          <Button variant="ghost" size="icon" className="md:hidden size-8" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Button>
        )}
      </div>

      {/* User Profile Section */}
      <div className="border-b px-4 py-3 bg-muted/10">
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="size-8 rounded-full" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user?.name?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium leading-none">{user?.name || "User"}</p>
            <p className="truncate text-xs text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex-1 overflow-hidden rounded-md border bg-background/80">
          <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
            <div className="space-y-4 text-sm leading-relaxed">
              {orderedMessages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                      }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              ))}

              {/* Show loading indicator when AI is thinking */}
              {isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-muted rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
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

        <form className="space-y-2" onSubmit={handleSubmit}>
          <Textarea
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe your goals, constraints, or preferences..."
            className="resize-none focus-visible:ring-1"
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !value.trim()}>
              {isPending ? "Scheduling..." : "Ask AI to schedule"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}