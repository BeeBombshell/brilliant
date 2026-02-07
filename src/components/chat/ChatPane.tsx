import { useMemo, useRef, useEffect, useState, type ReactNode } from "react";
import { useAtom } from "jotai";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageBox } from "@/components/chat/MessageBox";
import { actionLogAtom } from "@/state/calendarAtoms";

import { useTamboSuggestions, useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import type { TamboThreadMessage } from "@tambo-ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { checkpointsAtom, eventsAtom, actionHistoryAtom, chatThreadIdAtom, threadsHistoryAtom } from "@/state/calendarAtoms";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: any[];
  /** Pre-rendered Tambo generative UI component */
  renderedComponent?: ReactNode;
}

interface ChatPaneProps {
  onClose?: () => void;
}

function ToolCallBox({
  toolCall,
  onRetry,
  isRetrying,
}: {
  toolCall: any;
  onRetry?: (toolCall: any) => void;
  isRetrying?: boolean;
}) {
  const isSuccess = toolCall.output?.success === true;
  const isError = toolCall.output?.success === false;
  const hasOutput = !!toolCall.output;
  const status = isSuccess ? "done" : isError ? "error" : hasOutput ? "done" : "running";

  const actionLabelMap: Record<string, string> = {
    createCalendarEvent: "Creating event",
    createRecurringEvent: "Creating recurring event",
    updateCalendarEvent: "Updating event",
    deleteCalendarEvent: "Deleting event",
    getCalendarEvents: "Fetching events",
    reorganizeEvents: "Reorganizing schedule",
  };

  const actionDoneMap: Record<string, string> = {
    createCalendarEvent: "Event created",
    createRecurringEvent: "Recurring event created",
    updateCalendarEvent: "Event updated",
    deleteCalendarEvent: "Event deleted",
    getCalendarEvents: "Events fetched",
    reorganizeEvents: "Schedule reorganized",
  };

  const label = status === "done"
    ? (actionDoneMap[toolCall.name] ?? toolCall.name ?? "Tool")
    : (actionLabelMap[toolCall.name] ?? toolCall.name ?? "Tool");

  // Extract message from output if available
  const message = toolCall.output?.message;

  return (
    <div className="my-1 flex items-center gap-2">
      <Badge
        variant="secondary"
        className={`text-[10px] font-semibold tracking-tight border ${
          status === "done"
            ? "border-emerald-500/30 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : status === "error"
            ? "border-red-500/30 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
            : "border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse"
        }`}
      >
        <span className={`mr-1.5 inline-flex size-1.5 rounded-full bg-current/70 ${status === "running" ? "animate-pulse" : ""}`} />
        {label}
        {message && status === "done" && (
          <span className="ml-1.5 text-[9px] font-normal opacity-70">· {message}</span>
        )}
      </Badge>
      {isError && onRetry && (
        <Button
          variant="ghost"
          size="xs"
          className="h-5 px-2 text-[9px]"
          onClick={() => onRetry(toolCall)}
          disabled={isRetrying}
        >
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      )}
    </div>
  );
}

export function ChatPane({ onClose }: ChatPaneProps) {
  const [actionLog] = useAtom(actionLogAtom);

  const [threadId] = useAtom(chatThreadIdAtom);
  const [threadsHistory, setThreadsHistory] = useAtom(threadsHistoryAtom);
  const [showHistory, setShowHistory] = useState(false);

  // Tambo AI hooks - these use the threadId from the provider
  const { thread, startNewThread, switchCurrentThread, generationStage, generationStatusMessage, sendThreadMessage } = useTamboThread();
  const { value, setValue, submit, isPending } = useTamboThreadInput();
  const {
    suggestions,
    accept,
    isPending: isSuggestionsPending,
    isError: isSuggestionsError,
    error: suggestionsError,
  } = useTamboSuggestions({ maxSuggestions: 3 });
  const [retryingToolId, setRetryingToolId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Combine mock messages with real Tambo thread messages
  const orderedMessages = useMemo<ChatMessage[]>(() => {
    const mockMessages: ChatMessage[] = [
      {
        id: "1",
        role: "assistant",
        content: "Tell me what you want to get done this week and I'll build a schedule.",
      },
    ];

    // Convert Tambo thread messages into ChatMessage format
    const tamboMessages: ChatMessage[] = thread?.messages
      ?.filter((msg: TamboThreadMessage) => msg.role !== "system" && !msg.parentMessageId)
      .map((msg: TamboThreadMessage) => {
        // --- Extract text content ---
        let contentString = "";
        if (msg.role === "tool") {
          contentString = "";
        } else if (typeof msg.content === "string") {
          contentString = msg.content;
        } else if (Array.isArray(msg.content)) {
          contentString = msg.content
            .filter((part: any) => part?.type === "text" && part.text)
            .map((part: any) => part.text)
            .join("");
        }

        // --- Extract tool calls ---
        const toolCalls: any[] = [];

        // OpenAI-style top-level tool_calls
        if ((msg as any).tool_calls) {
          (msg as any).tool_calls.forEach((tc: any) => {
            const id = tc.id;
            const name = tc.function?.name || tc.name || "Tool";
            let input = tc.input || tc.function?.arguments || {};
            try {
              if (typeof input === "string") input = JSON.parse(input);
            } catch { /* keep as string */ }

            toolCalls.push({ id, name, input, output: undefined });
          });
        }

        // Also check toolCallRequest from Tambo
        const toolCallReq = (msg.toolCallRequest ?? msg.component?.toolCallRequest) as any;
        if (toolCallReq && toolCalls.length === 0) {
          toolCalls.push({
            id: toolCallReq.id,
            name: toolCallReq.function?.name ?? "Tool",
            input: toolCallReq.function?.arguments ?? {},
            output: undefined,
          });
        }

        // Pair tool results from subsequent messages
        if (toolCalls.length > 0) {
          const allMsgs = thread?.messages ?? [];
          const thisIdx = allMsgs.indexOf(msg);
          for (let i = thisIdx + 1; i < allMsgs.length; i++) {
            const nextMsg = allMsgs[i];
            if (nextMsg.role === "tool" || (nextMsg as any).role === "tool") {
              const toolCallId = (nextMsg as any).tool_call_id;
              const matched = toolCalls.find(tc => tc.id === toolCallId);
              if (matched && !matched.output) {
                try {
                  const parsed = typeof nextMsg.content === "string"
                    ? JSON.parse(nextMsg.content)
                    : nextMsg.content;
                  matched.output = parsed;
                } catch {
                  matched.output = nextMsg.content;
                }
              }
            }
            // Stop when we hit the next non-tool message
            if (nextMsg.role !== "tool") break;
          }
        }

        return {
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: contentString.trim(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          renderedComponent: msg.renderedComponent,
        };
      })
      .filter((msg: ChatMessage) => {
        // Always keep messages that have tool calls or rendered components
        if (msg.toolCalls && msg.toolCalls.length > 0) return true;
        if (msg.renderedComponent) return true;

        // Hide empty assistant messages
        if (msg.role === "assistant" && !msg.content) return false;

        // Hide tool-role messages (already paired above)
        return msg.content.trim() !== "" || msg.role === "user";
      }) || [];

    return [...mockMessages, ...tamboMessages];
  }, [thread?.messages]);

  const [checkpoints, setCheckpoints] = useAtom(checkpointsAtom);
  const [, setEvents] = useAtom(eventsAtom);
  const [, setHistory] = useAtom(actionHistoryAtom);

  const handleRevert = (messageId: string) => {
    const checkpoint = checkpoints.find(c => c.messageId === messageId);
    if (!checkpoint) return;

    // Get the actions to undo
    const actionsToUndo = history.slice(checkpoint.historyIndex);

    // Directly update atoms - revert each action
    setEvents(prevEvents => {
      let newEvents = [...prevEvents];

      actionsToUndo.reverse().forEach(action => {
        switch (action.type) {
          case 'ADD_EVENT':
            newEvents = newEvents.filter(e => e.id !== action.payload.event.id);
            break;
          case 'DELETE_EVENT':
            newEvents = [...newEvents, action.payload.event];
            break;
          case 'UPDATE_EVENT':
          case 'MOVE_EVENT':
            newEvents = newEvents.map(e =>
              e.id === action.payload.after.id ? action.payload.before : e
            );
            break;
        }
      });

      return newEvents;
    });

    // Update state
    setHistory(prev => prev.slice(0, checkpoint.historyIndex));
    setCheckpoints(prev => prev.filter(c => c.messageId !== messageId));
  };

  const handleNewChat = () => {
    // Save current thread to history if it has messages
    if (threadId && thread?.messages && (thread.messages as any).length > 0) {
      const firstUserMsg = orderedMessages.find(m => m.role === 'user')?.content;
      const title = typeof firstUserMsg === 'string' ? firstUserMsg.slice(0, 30) + '...' : 'New Chat';

      if (!threadsHistory.some(t => t.id === threadId)) {
        setThreadsHistory(prev => [{
          id: threadId,
          title,
          timestamp: new Date().toISOString()
        }, ...prev]);
      }
    }

    // Reset local state
    setCheckpoints([]);
    setValue("");

    // Start a new thread via Tambo
    if (startNewThread) {
      startNewThread();
    }
  };

  const switchToThread = (id: string) => {
    // Use Tambo's API to switch threads
    if (switchCurrentThread) {
      switchCurrentThread(id);
    }
    setShowHistory(false);
  };

  const [history] = useAtom(actionHistoryAtom);

  // Auto-checkpointing logic
  useEffect(() => {
    let hasChanged = false;
    const newCheckpoints = [...checkpoints];

    orderedMessages.forEach((msg, idx) => {
      if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        if (!newCheckpoints.some(c => c.messageId === msg.id)) {
          // Find ai actions that haven't been checkpointed yet
          const aiActions = history.filter(a => a.source === 'ai' && !newCheckpoints.some(c => c.eventIds.some(id => {
            if (a.type === 'ADD_EVENT') return id === a.payload.event.id;
            if (a.type === 'UPDATE_EVENT') return id === a.payload.after.id;
            if (a.type === 'DELETE_EVENT') return id === a.payload.event.id;
            return false;
          })));

          const eventIds = aiActions.flatMap(a => {
            if (a.type === 'ADD_EVENT') return [a.payload.event.id];
            if (a.type === 'UPDATE_EVENT') return [a.payload.after.id];
            if (a.type === 'DELETE_EVENT') return [a.payload.event.id];
            return [];
          });

          if (eventIds.length > 0) {
            // Find the user message just before this assistant message to use as the checkpoint anchor
            const userMsgId = orderedMessages.slice(0, idx).reverse().find(m => m.role === 'user')?.id || msg.id;

            newCheckpoints.push({
              messageId: userMsgId,
              historyIndex: history.indexOf(aiActions[0]),
              eventIds: Array.from(new Set(eventIds))
            });
            hasChanged = true;
          }
        }
      }
    });

    if (hasChanged) {
      setCheckpoints(newCheckpoints);
    }
  }, [orderedMessages, history, checkpoints, setCheckpoints]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [orderedMessages, isPending]);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!value.trim() || isPending) return;
    const submitPromise = submit({ streamResponse: true });
    setValue("");
    await submitPromise;
  };

  const latestAssistantMessageId = useMemo(() => {
    const latest = [...(thread?.messages ?? [])].reverse().find(msg => msg.role === "assistant");
    return latest?.id;
  }, [thread?.messages]);

  const hasTamboAssistantMessage = useMemo(
    () => (thread?.messages ?? []).some(msg => msg.role === "assistant"),
    [thread?.messages]
  );

  const visibleSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    if (!latestAssistantMessageId) return suggestions;
    return suggestions.filter((suggestion: any) => suggestion.messageId === latestAssistantMessageId);
  }, [suggestions, latestAssistantMessageId]);

  const safeSuggestions = useMemo(() => {
    return (visibleSuggestions ?? [])
      .map((suggestion: any) => {
        if (!suggestion) return null;
        const title = suggestion?.title ?? suggestion?.text ?? suggestion?.detailedSuggestion ?? "Suggestion";
        const detailedSuggestion = suggestion?.detailedSuggestion ?? suggestion?.detail ?? suggestion?.text ?? title;
        return {
          ...suggestion,
          title,
          detailedSuggestion,
        };
      })
      .filter(Boolean);
  }, [visibleSuggestions]);

  const handleSuggestionAccept = async (suggestion: any) => {
    if (!suggestion) return;
    const detailedSuggestion =
      suggestion.detailedSuggestion ??
      suggestion.detail ??
      suggestion.text ??
      suggestion.title ??
      "";
    if (!detailedSuggestion) return;
    await accept({
      suggestion: {
        ...suggestion,
        detailedSuggestion,
      },
      shouldSubmit: true,
    });
  };

  const handleRetryToolCall = async (toolCall: any) => {
    if (!sendThreadMessage) return;
    setRetryingToolId(toolCall.id ?? toolCall.name ?? "retry");
    try {
      const input = typeof toolCall.input === "string"
        ? toolCall.input
        : JSON.stringify(toolCall.input ?? {}, null, 2);
      await sendThreadMessage(
        `Retry the tool "${toolCall.name}" with the same input:\n${input}`,
        { streamResponse: true }
      );
    } finally {
      setRetryingToolId(null);
    }
  };

  return (
    <Card className="flex h-full flex-col border-l-0 border-t-0 rounded-none bg-card/80 shadow-none min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setShowHistory(!showHistory)}
            title="Thread History"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </Button>
          <span className="text-sm font-semibold">Brilliant Planner</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={handleNewChat} title="New Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="md:hidden size-8" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="border-b bg-muted/5 p-2 max-h-40 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 mb-1">Thread History</p>
          <div className="space-y-1">
            {threadsHistory.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1 italic">No previous threads</p>}
            {threadsHistory.map(t => (
              <button
                key={t.id}
                onClick={() => switchToThread(t.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-muted ${threadId === t.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
              >
                <div className="truncate">{t.title}</div>
                <div className="text-[9px] opacity-60">{new Date(t.timestamp).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-3 overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden rounded-md border bg-background/80 min-h-0">
          <div ref={messagesContainerRef} className="h-full overflow-y-auto p-3 scroll-smooth">
            <div className="space-y-4 text-sm leading-relaxed">
              {orderedMessages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                      }`}
                  >
                    {msg.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {msg.toolCalls && (
                      <div className="mt-2 space-y-2">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5 px-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0z" /><path d="m20 10 2 2" /><path d="m10 20 2 2" /><path d="m3 3 7 7" /><path d="m14 14 7 7" />
                          </svg>
                          AI Actions
                        </div>
                        {msg.toolCalls.map((tc, i) => (
                          <ToolCallBox
                            key={i}
                            toolCall={tc}
                            onRetry={handleRetryToolCall}
                            isRetrying={retryingToolId === (tc.id ?? tc.name)}
                          />
                        ))}
                      </div>
                    )}

                    {checkpoints.some(c => c.messageId === msg.id) && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="xs"
                          className={`h-5 text-[9px] px-1.5 transition-colors gap-1 border border-border/50 ${msg.role === "user"
                            ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            }`}
                          onClick={() => handleRevert(msg.id)}
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

                  {/* Tambo generative UI component — rendered below the message bubble */}
                  {msg.role === "assistant" && msg.renderedComponent && (
                    <div className="w-full mt-2 min-w-0 overflow-x-hidden">
                      {msg.renderedComponent}
                    </div>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-muted rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {generationStage === 'CHOOSING_COMPONENT' ? 'Selecting component...' :
                           generationStage === 'FETCHING_CONTEXT' ? 'Gathering context...' :
                           generationStage === 'HYDRATING_COMPONENT' ? 'Preparing response...' :
                           generationStage === 'STREAMING_RESPONSE' ? 'Generating...' :
                           'Thinking...'}
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

        {(hasTamboAssistantMessage || isSuggestionsPending || isSuggestionsError) && (
          <Card className="space-y-2 bg-background/80 p-3">
            <div className="text-[0.7rem] font-medium uppercase text-muted-foreground">
              Suggested next steps
            </div>
            {isSuggestionsPending && (
              <div className="text-xs text-muted-foreground">Generating suggestions...</div>
            )}
            {isSuggestionsError && (
              <div className="text-xs text-destructive">
                {suggestionsError instanceof Error ? suggestionsError.message : "Unable to load suggestions."}
              </div>
            )}
            {!isSuggestionsPending && !isSuggestionsError && safeSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {safeSuggestions.map((suggestion: any) => {
                  const title = suggestion.title;
                  const tooltip = suggestion.detailedSuggestion ?? suggestion.title ?? "";
                  return (
                  <Button
                    key={suggestion?.id ?? title}
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs"
                    onClick={() => handleSuggestionAccept(suggestion)}
                    disabled={isPending || isSuggestionsPending}
                    title={tooltip}
                  >
                    {title}
                  </Button>
                  );
                })}
              </div>
            )}
            {!isSuggestionsPending && !isSuggestionsError && safeSuggestions.length === 0 && (
              <div className="text-xs text-muted-foreground">No suggestions available yet.</div>
            )}
          </Card>
        )}

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

        <MessageBox
          value={value}
          onChange={setValue}
          onSubmit={() => handleSubmit()}
          placeholder="Describe your goals, constraints, or preferences..."
          disabled={isPending}
        />
      </div>
    </Card>
  );
}