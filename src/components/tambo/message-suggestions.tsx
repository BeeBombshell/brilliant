"use client";

import { MessageGenerationStage } from "./message-generation-stage";
import { Tooltip, TooltipProvider } from "./suggestions-tooltip";
import { cn } from "@/lib/utils";
import type { Suggestion, TamboThreadMessage } from "@tambo-ai/react";
import {
  useTambo,
  useTamboSuggestions,
  useTamboThreadInput,
  TamboThreadInputProvider,
} from "@tambo-ai/react";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { useEffect } from "react";

/**
 * @typedef MessageSuggestionsContextValue
 * @property {Array} suggestions - Array of suggestion objects
 * @property {string|null} selectedSuggestionId - ID of the currently selected suggestion
 * @property {function} accept - Function to accept a suggestion
 * @property {boolean} isGenerating - Whether suggestions are being generated
 * @property {Error|null} error - Any error from generation
 * @property {object} thread - The current Tambo thread
 */
interface MessageSuggestionsContextValue {
  suggestions: Suggestion[];
  selectedSuggestionId: string | null;
  accept: (options: { suggestion: Suggestion }) => Promise<void>;
  submit: () => Promise<void | any>;
  isGenerating: boolean;
  error: Error | null;
  messages: TamboThreadMessage[];
  isStreaming: boolean;
  isMac: boolean;
  setValue: (value: string) => void;
}

/**
 * React Context for sharing suggestion data and functions among sub-components.
 * @internal
 */
const MessageSuggestionsContext =
  React.createContext<MessageSuggestionsContextValue | null>(null);

/**
 * Hook to access the message suggestions context.
 * @returns {MessageSuggestionsContextValue} The message suggestions context value.
 * @throws {Error} If used outside of MessageSuggestions.
 * @internal
 */
const useMessageSuggestionsContext = () => {
  const context = React.useContext(MessageSuggestionsContext);
  if (!context) {
    throw new Error(
      "MessageSuggestions sub-components must be used within a MessageSuggestions",
    );
  }
  return context;
};

/**
 * Props for the MessageSuggestions component.
 * Extends standard HTMLDivElement attributes.
 */
export interface MessageSuggestionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum number of suggestions to display (default: 3) */
  maxSuggestions?: number;
  /** The child elements to render within the container. */
  children?: React.ReactNode;
  /** Pre-seeded suggestions to display initially */
  initialSuggestions?: Suggestion[];
}

/**
 * The root container for message suggestions.
 * It establishes the context for its children and handles overall state management.
 * @component MessageSuggestions
 * @example
 * ```tsx
 * <MessageSuggestions maxSuggestions={3}>
 *   <MessageSuggestions.Status />
 *   <MessageSuggestions.List />
 * </MessageSuggestions>
 * ```
 */
const MessageSuggestions = React.forwardRef<
  HTMLDivElement,
  MessageSuggestionsProps
>(
  (
    {
      children,
      className,
      maxSuggestions = 3,
      initialSuggestions = [],
      ...props
    },
    ref,
  ) => {
    return (
      <TamboThreadInputProvider>
        <MessageSuggestionsContent
          ref={ref}
          maxSuggestions={maxSuggestions}
          initialSuggestions={initialSuggestions}
          className={className}
          {...props}
        >
          {children}
        </MessageSuggestionsContent>
      </TamboThreadInputProvider>
    );
  },
);
MessageSuggestions.displayName = "MessageSuggestions";

/**
 * Internal content component that uses the isolated ThreadInput context
 */
const MessageSuggestionsContent = React.forwardRef<
  HTMLDivElement,
  MessageSuggestionsProps
>(
  (
    {
      children,
      className,
      maxSuggestions = 3,
      initialSuggestions = [],
      ...props
    },
    ref,
  ) => {
    const { messages, isStreaming } = useTambo();
    const {
      suggestions: generatedSuggestions,
      selectedSuggestionId,
      accept,
      isGenerating,
      error,
    } = useTamboSuggestions({ maxSuggestions });

    // Combine initial and generated suggestions
    // Fallback to initial suggestions if generated ones are empty
    const suggestions = React.useMemo(() => {
      if (generatedSuggestions && generatedSuggestions.length > 0) {
        return generatedSuggestions;
      }
      return initialSuggestions.slice(0, maxSuggestions);
    }, [
      generatedSuggestions,
      initialSuggestions,
      maxSuggestions,
    ]);

    const isMac =
      typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

    const { submit, setValue } = useTamboThreadInput();

    const contextValue = React.useMemo(
      () => ({
        suggestions,
        selectedSuggestionId,
        accept,
        submit,
        isGenerating,
        error,
        messages,
        isStreaming,
        isMac,
        setValue: (val: string) => {
          console.log("Setting suggestion value:", val);
          setValue(val);
        },
      }),
      [
        suggestions,
        selectedSuggestionId,
        accept,
        submit,
        isGenerating,
        error,
        messages,
        isStreaming,
        isMac,
        setValue,
      ],
    );

    // Handle keyboard shortcuts for selecting suggestions
    useEffect(() => {
      if (!suggestions || suggestions.length === 0) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        const modifierPressed = isMac
          ? event.metaKey && event.altKey
          : event.ctrlKey && event.altKey;

        if (modifierPressed) {
          const keyNum = parseInt(event.key);
          if (!isNaN(keyNum) && keyNum > 0 && keyNum <= suggestions.length) {
            event.preventDefault();
            const suggestionIndex = keyNum - 1;
            void (async () => {
              const suggestion = suggestions[suggestionIndex];
              await accept({ suggestion });

              const textToSet = (suggestion as any).text || (suggestion as any).prompt || (suggestion as any).content || suggestion.title;
              if (textToSet) {
                setValue(textToSet);
              }

              try {
                await submit();
              } catch (e) {
                console.error("Shortcut submission failed", e);
              }
            })();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [suggestions, accept, isMac, setValue, submit]);

    // If we have no messages yet and no initial suggestions, render nothing
    if (!messages.length && initialSuggestions.length === 0) {
      return null;
    }

    return (
      <MessageSuggestionsContext.Provider value={contextValue}>
        <TooltipProvider>
          <div
            ref={ref}
            className={cn("px-4 pb-2", className)}
            data-slot="message-suggestions-container"
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </MessageSuggestionsContext.Provider>
    );
  },
);
MessageSuggestionsContent.displayName = "MessageSuggestionsContent";

/**
 * Props for the MessageSuggestionsStatus component.
 * Extends standard HTMLDivElement attributes.
 */
export type MessageSuggestionsStatusProps =
  React.HTMLAttributes<HTMLDivElement>;

/**
 * Displays loading, error, or generation stage information.
 * Automatically connects to the context to show the appropriate status.
 * @component MessageSuggestions.Status
 * @example
 * ```tsx
 * <MessageSuggestions>
 *   <MessageSuggestions.Status />
 *   <MessageSuggestions.List />
 * </MessageSuggestions>
 * ```
 */
const MessageSuggestionsStatus = React.forwardRef<
  HTMLDivElement,
  MessageSuggestionsStatusProps
>(({ className, ...props }, ref) => {
  const { error, isGenerating, isStreaming } = useMessageSuggestionsContext();

  return (
    <div
      ref={ref}
      className={cn(
        "p-2 rounded-md text-sm bg-transparent",
        !error && !isGenerating && !isStreaming ? "p-0 min-h-0 mb-0" : "",
        className,
      )}
      data-slot="message-suggestions-status"
      {...props}
    >
      {/* Error state - mute 404 errors as they are non-fatal for suggestions */}
      {error && !error.message.includes("404") && (
        <div className="p-2 rounded-md text-sm bg-red-50 text-red-500">
          <p>{error.message}</p>
        </div>
      )}

      {/* Always render a container for generation stage to prevent layout shifts */}
      <div className="generation-stage-container">
        {isStreaming && <MessageGenerationStage />}
      </div>
    </div>
  );
});
MessageSuggestionsStatus.displayName = "MessageSuggestions.Status";

/**
 * Props for the MessageSuggestionsList component.
 * Extends standard HTMLDivElement attributes.
 */
export type MessageSuggestionsListProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Displays the list of suggestion buttons.
 * Automatically connects to the context to show the suggestions.
 * @component MessageSuggestions.List
 * @example
 * ```tsx
 * <MessageSuggestions>
 *   <MessageSuggestions.Status />
 *   <MessageSuggestions.List />
 * </MessageSuggestions>
 * ```
 */
const MessageSuggestionsList = React.forwardRef<
  HTMLDivElement,
  MessageSuggestionsListProps
>(({ className, ...props }, ref) => {
  const { suggestions, selectedSuggestionId, submit, isGenerating, isMac, isStreaming, setValue } =
    useMessageSuggestionsContext();

  const modKey = isMac ? "⌘" : "Ctrl";
  const altKey = isMac ? "⌥" : "Alt";


  return (
    <div
      ref={ref}
      className={cn(
        "flex space-x-2 overflow-x-auto pb-2 rounded-md bg-transparent min-h-[2.5rem] scrollbar-hide py-1",
        isGenerating ? "opacity-70 pointer-events-none" : "",
        className,
      )}
      data-slot="message-suggestions-list"
      {...props}
    >
      <AnimatePresence mode="popLayout">
        {suggestions.length > 0
          ? suggestions.map((suggestion, index) => (
            <Tooltip
              key={suggestion.id}
              content={
                <span suppressHydrationWarning>
                  {modKey}+{altKey}+{index + 1}
                </span>
              }
              side="top"
            >
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className={cn(
                  "py-2 px-4 rounded-full text-[13px] transition-all whitespace-nowrap flex-shrink-0 relative overflow-hidden group border",
                  getSuggestionButtonClassName({
                    isGenerating,
                    isSelected: selectedSuggestionId === suggestion.id,
                  }),
                )}
                onClick={async () => {
                  console.log("Suggestion clicked:", suggestion);
                  if (!isGenerating && !isStreaming) {
                    try {
                      const textToSet = (suggestion as any).text || (suggestion as any).prompt || (suggestion as any).content || suggestion.title;

                      if (textToSet) {
                        setValue(textToSet);
                      }

                      // Small delay to ensure state updates have propagated
                      await new Promise(resolve => setTimeout(resolve, 80));

                      console.log("Submitting suggestion text...");
                      await submit();
                    } catch (e) {
                      console.error("Suggestion submission failed", e);
                      await submit().catch(() => { });
                    }
                  }
                }}
                disabled={isGenerating}
                data-suggestion-id={suggestion.id}
                data-suggestion-index={index}
              >
                {isGenerating && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear",
                    }}
                  />
                )}
                <span className="font-medium relative z-20">{suggestion.title}</span>
              </motion.button>
            </Tooltip>
          ))
          : null}
      </AnimatePresence>
    </div>
  );
});
MessageSuggestionsList.displayName = "MessageSuggestions.List";

/**
 * Internal function to get className for suggestion button based on state
 */
function getSuggestionButtonClassName({
  isGenerating,
  isSelected,
}: {
  isGenerating: boolean;
  isSelected: boolean;
}) {
  if (isGenerating) {
    return "bg-muted/50 text-muted-foreground border-transparent opacity-50 cursor-not-allowed";
  }
  if (isSelected) {
    return "bg-primary/10 text-primary border-primary/30 shadow-sm";
  }
  return "bg-white dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800 text-foreground border-border/60 shadow-sm hover:shadow-md hover:-translate-y-0.5";
}

export {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
  Tooltip,
  TooltipProvider,
};
