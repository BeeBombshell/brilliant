import { useMemo, useRef, useEffect, useState } from "react";
import { useAtom } from "jotai";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageBox } from "@/components/chat/MessageBox";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ThreadHistoryPanel } from "@/components/chat/ThreadHistoryPanel";
import { ChatMessages, type ChatMessage } from "@/components/chat/ChatMessages";
import { SuggestionsPanel } from "@/components/chat/SuggestionsPanel";
// import { RecentChangesPanel } from "@/components/chat/RecentChangesPanel";
// import { actionLogAtom } from "@/state/calendarAtoms";

import { useTamboSuggestions, useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import type { TamboThreadMessage } from "@tambo-ai/react";
import { checkpointsAtom, eventsAtom, actionHistoryAtom, chatThreadIdAtom, threadsHistoryAtom } from "@/state/calendarAtoms";

interface ChatPaneProps {
  onClose?: () => void;
}

export function ChatPane({ onClose }: ChatPaneProps) {
  // const [actionLog] = useAtom(actionLogAtom);

  const [threadId] = useAtom(chatThreadIdAtom);
  const [threadsHistory, setThreadsHistory] = useAtom(threadsHistoryAtom);

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

  const historyMenuTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      title="Thread History"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </Button>
  );

  return (
    <Card className="flex h-full flex-col border-l-0 border-t-0 rounded-none bg-card/80 shadow-none min-w-0 overflow-hidden">
      <ChatHeader
        threadHistoryMenu={(
          <ThreadHistoryPanel
            threadsHistory={threadsHistory}
            activeThreadId={threadId}
            onSelectThread={switchToThread}
            trigger={historyMenuTrigger}
          />
        )}
        onNewChat={handleNewChat}
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col gap-3 p-3 overflow-hidden min-h-0">
        <ChatMessages
          orderedMessages={orderedMessages}
          checkpoints={checkpoints}
          isPending={isPending}
          generationStage={generationStage}
          generationStatusMessage={generationStatusMessage}
          onRevert={handleRevert}
          onRetryToolCall={handleRetryToolCall}
          retryingToolId={retryingToolId}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
        />

        <SuggestionsPanel
          visible={hasTamboAssistantMessage || isSuggestionsPending || isSuggestionsError}
          isSuggestionsPending={isSuggestionsPending}
          isSuggestionsError={isSuggestionsError}
          suggestionsError={suggestionsError}
          safeSuggestions={safeSuggestions}
          isPending={isPending}
          onAccept={handleSuggestionAccept}
        />

        {/* <RecentChangesPanel actionLog={actionLog} /> */}

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