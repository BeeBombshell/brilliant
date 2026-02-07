import type { ReactNode, RefObject } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { ToolCallBox } from "@/components/chat/ToolCallBox";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: any[];
  renderedComponent?: ReactNode;
}

interface ChatMessagesProps {
  orderedMessages: ChatMessage[];
  checkpoints: { messageId: string }[];
  isPending: boolean;
  generationStage?: string | null;
  generationStatusMessage?: string | null;
  onRevert: (messageId: string) => void;
  onRetryToolCall: (toolCall: any) => void;
  retryingToolId: string | null;
  messagesContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessages({
  orderedMessages,
  checkpoints,
  isPending,
  generationStage,
  generationStatusMessage,
  onRevert,
  onRetryToolCall,
  retryingToolId,
  messagesContainerRef,
  messagesEndRef,
}: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-hidden rounded-md border bg-background/80 min-h-0">
      <div ref={messagesContainerRef} className="h-full overflow-y-auto p-3 scroll-smooth">
        <div className="space-y-4 text-sm leading-relaxed">
          {orderedMessages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted text-foreground rounded-tl-none"
                }`}
              >
                {msg.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {msg.toolCalls && (
                  <div className="mt-2 space-y-2">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5 px-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0z" />
                        <path d="m20 10 2 2" />
                        <path d="m10 20 2 2" />
                        <path d="m3 3 7 7" />
                        <path d="m14 14 7 7" />
                      </svg>
                      AI Actions
                    </div>
                    {msg.toolCalls.map((tc, i) => (
                      <ToolCallBox
                        key={i}
                        toolCall={tc}
                        onRetry={onRetryToolCall}
                        isRetrying={retryingToolId === (tc.id ?? tc.name)}
                      />
                    ))}
                  </div>
                )}

                {checkpoints.some((c) => c.messageId === msg.id) && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      className={`h-5 text-[9px] px-1.5 transition-colors gap-1 border border-border/50 ${
                        msg.role === "user"
                          ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      }`}
                      onClick={() => onRevert(msg.id)}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      Revert to here
                    </Button>
                  </div>
                )}
              </div>

              {msg.role === "assistant" && msg.renderedComponent && (
                <div className="w-full mt-2 min-w-0 overflow-x-hidden">{msg.renderedComponent}</div>
              )}
            </div>
          ))}

          {isPending && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-muted rounded-tl-none shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span
                      className="size-1.5 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="size-1.5 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="size-1.5 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {generationStage === "CHOOSING_COMPONENT"
                        ? "Selecting component..."
                        : generationStage === "FETCHING_CONTEXT"
                          ? "Gathering context..."
                          : generationStage === "HYDRATING_COMPONENT"
                            ? "Preparing response..."
                            : generationStage === "STREAMING_RESPONSE"
                              ? "Generating..."
                              : "Thinking..."}
                    </span>
                    {generationStatusMessage && (
                      <span className="text-[10px] text-muted-foreground/70">{generationStatusMessage}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
