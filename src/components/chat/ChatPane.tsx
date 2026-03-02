import { useMemo, useRef, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";

import { Button } from "@/components/ui/button";
import { IconMenu2, IconRotateClockwise } from "@tabler/icons-react";
import { Check, Loader2 } from "lucide-react";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ThreadHistoryPanel } from "@/components/chat/ThreadHistoryPanel";

import { TamboThreadInputProvider, useTambo, useTamboThreadList } from "@tambo-ai/react";
import type { Content, Suggestion, TamboToolUseContent, TextContent, UseTamboReturn } from "@tambo-ai/react";
import { checkpointsAtom, eventsAtom, actionHistoryAtom, chatThreadIdAtom } from "@/state/calendarAtoms";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";

import {
  Message,
  MessageContent,
  MessageImages,
  MessageRenderedComponentArea,
  ReasoningInfo,
} from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputTextarea,
  MessageInputToolbar,
  MessageInputSubmitButton,
  MessageInputFileButton,
  MessageInputError,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "./ErrorBoundary";

const ACTION_LABELS: Record<string, { active: string; done: string }> = {
  createCalendarEvent: { active: "Creating event", done: "Event created" },
  createRecurringEvent: { active: "Creating recurring event", done: "Recurring event created" },
  updateCalendarEvent: { active: "Updating event", done: "Event updated" },
  deleteCalendarEvent: { active: "Deleting event", done: "Event deleted" },
  getCalendarEvents: { active: "Fetching events", done: "Events fetched" },
  reorganizeEvents: { active: "Reorganizing schedule", done: "Schedule reorganized" },
};

function getStableOrderedMessages(messages: UseTamboReturn["messages"]) {
  const parseCreatedAtMs = (value: unknown) => {
    if (!value) return null;
    const ms = new Date(String(value)).getTime();
    return Number.isFinite(ms) ? ms : null;
  };

  return [...messages]
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const timeA = parseCreatedAtMs(a.message.createdAt);
      const timeB = parseCreatedAtMs(b.message.createdAt);

      // If either message doesn't have a usable timestamp, keep SDK order.
      // This prevents optimistic/streaming messages from jumping around.
      if (timeA === null || timeB === null) {
        return a.index - b.index;
      }

      return timeA - timeB || a.index - b.index;
    })
    .map((e) => e.message);
}

function ToolCallBadge({ block, isStreaming }: { block: TamboToolUseContent; isStreaming: boolean }) {
  const toolName = block.name || "tool";
  const labels = ACTION_LABELS[toolName] || { active: `Running ${toolName}`, done: toolName };
  const label = isStreaming ? labels.active : labels.done;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
        isStreaming
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
      )}
    >
      {isStreaming ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Check className="w-3 h-3" />
      )}
      {label}
    </span>
  );
}

function isToolUseBlock(block: Content): block is TamboToolUseContent {
  return block.type === "tool_use";
}

interface ChatPaneProps {
  onClose?: () => void;
}

export function ChatPane({ onClose }: ChatPaneProps) {
  const [threadId, setThreadId] = useAtom(chatThreadIdAtom);
  const { user } = useGoogleAuth();
  const storageKey = useMemo(() => `tambo_last_thread_id_${user?.email ?? "guest"}`, [user?.email]);

  const {
    messages,
    currentThreadId,
    startNewThread,
    switchThread,
    isIdle,
  } = useTambo() satisfies UseTamboReturn;

  const { data: threadListData } = useTamboThreadList();

  const isPending = !isIdle;

  const [checkpoints, setCheckpoints] = useAtom(checkpointsAtom);
  const [, setEvents] = useAtom(eventsAtom);
  const [, setHistory] = useAtom(actionHistoryAtom);
  const history = useAtomValue(actionHistoryAtom);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const handleChatReset = () => {
    setCheckpoints([]);
    setThreadId(null);

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }

    try {
      if (startNewThread) {
        startNewThread();
        return;
      }
    } catch {
      // ignore
    }

    window.location.reload();
  };

  const filteredMessages = useMemo(() => {
    const orderedMessages = isIdle ? getStableOrderedMessages(messages) : messages;

    return orderedMessages.filter((message, index) => {
      // Hide system messages
      if (message.role === "system") return false;

      // Hide messages that only contain tool_result content blocks
      if (
        Array.isArray(message.content) &&
        message.content.length > 0 &&
        message.content.every((block) => block.type === "tool_result")
      ) {
        return false;
      }

      // Hide empty assistant messages while generating to prevent layout shifts
      const isGenerating = !isIdle;
      const isLast = index === orderedMessages.length - 1;
      const isEmpty = (!message.content || (Array.isArray(message.content) && message.content.length === 0)) && !message.reasoning;
      if (
        message.role === "assistant" &&
        isGenerating &&
        isLast &&
        isEmpty
      ) {
        return false;
      }

      return true;
    });
  }, [messages, isIdle]);

  const handleRevert = (messageId: string) => {
    const checkpoint = checkpoints.find(c => c.messageId === messageId);
    if (!checkpoint) return;

    const actionsToUndo = history.slice(checkpoint.historyIndex);

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

    setHistory(prev => prev.slice(0, checkpoint.historyIndex));
    setCheckpoints(prev => prev.filter(c => c.messageId !== messageId));
  };

  const handleNewChat = () => {
    setCheckpoints([]);
    if (startNewThread) {
      startNewThread();
    }
  };

  const switchToThread = (id: string) => {
    if (switchThread) {
      switchThread(id);
    }
  };

  const threadHistoryItems = useMemo(() => {
    const rawThreads = threadListData?.threads ?? [];

    return rawThreads.map((t) => ({
      id: t.id,
      title: t.name || `Chat ${t.id.substring(0, 8)}`,
      timestamp: t.updatedAt || t.createdAt,
    }));
  }, [threadListData]);

  // Auto-checkpointing logic
  useEffect(() => {
    let hasChanged = false;
    const newCheckpoints = [...checkpoints];

    filteredMessages.forEach((msg, idx) => {
      const hasToolUse = Array.isArray(msg.content) && msg.content.some(block => block.type === "tool_use");
      if (msg.role === "assistant" && hasToolUse) {
        if (!newCheckpoints.some(c => c.messageId === msg.id)) {
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
            const userMsgId = filteredMessages.slice(0, idx).reverse().find(m => m.role === 'user')?.id || msg.id;

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
  }, [filteredMessages, history, checkpoints, setCheckpoints]);

  useEffect(() => {
    if (currentThreadId && currentThreadId !== threadId) {
      setThreadId(currentThreadId);
      localStorage.setItem(storageKey, currentThreadId);
    }
  }, [currentThreadId, threadId, setThreadId, storageKey]);

  useEffect(() => {
    if (!switchThread) return;
    const storedThreadId = localStorage.getItem(storageKey);
    if (!storedThreadId) return;
    if (currentThreadId === storedThreadId) return;
    if (messages && messages.length > 0) return;
    if (threadHistoryItems.some((t) => t.id === storedThreadId)) {
      switchThread(storedThreadId);
    }
  }, [switchThread, storageKey, currentThreadId, messages, threadHistoryItems]);

  const historyMenuTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 hover:bg-muted"
      title="Thread History"
    >
      <IconMenu2 size={18} />
    </Button>
  );

  return (
    <div className="flex h-full flex-col bg-background min-w-0 overflow-hidden">
      <ErrorBoundary onReset={handleChatReset}>
        <ChatHeader
          threadHistoryMenu={(
            <ThreadHistoryPanel
              threadsHistory={threadHistoryItems}
              activeThreadId={currentThreadId || threadId}
              onSelectThread={switchToThread}
              onNewThread={handleNewChat}
              trigger={historyMenuTrigger}
            />
          )}
          onClose={onClose}
        />

        <div className="flex flex-1 flex-col overflow-hidden min-h-0">
          <ScrollableMessageContainer
            ref={messagesContainerRef}
            className="px-4 pt-4"
          >
            <div className="flex flex-col gap-3 pb-4">
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
                  <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <img src="/brilliant.svg" className="size-8" alt="Brilliant" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Welcome to Brilliant</h3>
                    <p className="text-sm mt-1 max-w-[260px] text-muted-foreground/80">
                      Tell me what you want to get done and I'll manage your schedule.
                    </p>
                  </div>
                </div>
              )}

              {filteredMessages.map((message, index) => {
                const isLastMessage = index === filteredMessages.length - 1;
                const hasRevert = checkpoints.some((c) => c.messageId === message.id);
                const role = message.role?.toLowerCase();
                const isAssistant = role === "assistant";
                const isUser = role === "user";

                const assistantContent = message.content as unknown as Content[] | string;
                const assistantContentBlocks: Content[] = Array.isArray(assistantContent)
                  ? assistantContent
                  : ([{ type: "text", text: assistantContent } satisfies TextContent] as Content[]);
                const assistantHasTextOrResource = assistantContentBlocks.some(
                  (b) => b.type === "text" || b.type === "resource"
                );

                const toolBlocks = Array.isArray(message.content)
                  ? message.content.filter(isToolUseBlock)
                  : [];

                return (
                  <div
                    key={message.id ?? `${message.role}-${index}-${message.createdAt}`}
                    className="flex flex-col w-full"
                  >
                    <Message
                      role={isAssistant ? "assistant" : "user"}
                      message={message}
                      className={cn(
                        "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                        isAssistant ? "justify-start" : "justify-end"
                      )}
                    >
                      <div className={cn(
                        "flex flex-col gap-1 mb-2",
                        isAssistant ? "items-start w-full" : "items-end w-full"
                      )}>
                        <ReasoningInfo />
                        <MessageImages />

                        {isUser ? (
                          <div className="bg-primary text-primary-foreground shadow-md rounded-[20px] rounded-tr-[4px] px-4 py-2.5 text-[14px] leading-relaxed max-w-[85%]">
                            <MessageContent
                              content={message.content}
                              className="bg-transparent text-primary-foreground p-0"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full max-w-[95%]">
                            {assistantHasTextOrResource ? (
                              <div className="bg-gray-100 dark:bg-[#2a2a2e] border border-border/50 text-foreground shadow-sm rounded-[20px] rounded-tl-[4px] px-4 py-3 text-[14px] leading-relaxed">
                                <MessageContent
                                  content={assistantContentBlocks}
                                  className="bg-transparent text-foreground p-0"
                                />
                              </div>
                            ) : null}

                            {toolBlocks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 py-1">
                                {toolBlocks.map((block, bIdx) => (
                                  <ToolCallBadge
                                    key={bIdx}
                                    block={block}
                                    isStreaming={isPending && isLastMessage}
                                  />
                                ))}
                              </div>
                            )}

                            <MessageRenderedComponentArea className="w-full" />
                          </div>
                        )}

                        {hasRevert && (
                          <div className="mt-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] px-3 font-medium transition-all gap-1.5 border border-primary/20 rounded-full text-primary/80 hover:text-primary hover:bg-primary/5 hover:border-primary/40 active:scale-95"
                              onClick={() => handleRevert(message.id)}
                            >
                              <IconRotateClockwise size={12} className="opacity-80" />
                              Revert schedule to here
                            </Button>
                          </div>
                        )}
                      </div>
                    </Message>
                  </div>
                );
              })}
            </div>
          </ScrollableMessageContainer>


          <div className="p-3 pt-1">
            <TamboThreadInputProvider>
              <MessageInput variant="solid" className="w-full">
                <MessageSuggestions
                  className="px-0 pb-2"
                  initialSuggestions={(
                    [
                      { id: "1", title: "Show my schedule for today", messageId: "init", detailedSuggestion: "Show my schedule for today" },
                      { id: "2", title: "What's on my calendar this week?", messageId: "init", detailedSuggestion: "What's on my calendar this week?" },
                      { id: "3", title: "Organize my afternoon", messageId: "init", detailedSuggestion: "Organize my afternoon" },
                    ] satisfies Suggestion[]
                  )}
                >
                  <MessageSuggestionsStatus />
                  <MessageSuggestionsList />
                </MessageSuggestions>
                <MessageInputTextarea
                  placeholder="What do you need on your calendar?"
                  className="text-sm min-h-[44px]"
                />
                <MessageInputToolbar>
                  <MessageInputFileButton />
                  <div className="flex-1" />
                  <MessageInputSubmitButton />
                </MessageInputToolbar>
                <MessageInputError />
              </MessageInput>
            </TamboThreadInputProvider>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
