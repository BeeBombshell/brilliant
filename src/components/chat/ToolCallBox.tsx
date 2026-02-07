import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ToolCallBoxProps {
  toolCall: any;
  onRetry?: (toolCall: any) => void;
  isRetrying?: boolean;
}

export function ToolCallBox({ toolCall, onRetry, isRetrying }: ToolCallBoxProps) {
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

  const label =
    status === "done"
      ? (actionDoneMap[toolCall.name] ?? toolCall.name ?? "Tool")
      : (actionLabelMap[toolCall.name] ?? toolCall.name ?? "Tool");

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
        <span
          className={`mr-1.5 inline-flex size-1.5 rounded-full bg-current/70 ${
            status === "running" ? "animate-pulse" : ""
          }`}
        />
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
