import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SuggestionsPanelProps {
  visible: boolean;
  isSuggestionsPending: boolean;
  isSuggestionsError: boolean;
  suggestionsError: unknown;
  safeSuggestions: any[];
  isPending: boolean;
  onAccept: (suggestion: any) => void;
}

export function SuggestionsPanel({
  visible,
  isSuggestionsPending,
  isSuggestionsError,
  suggestionsError,
  safeSuggestions,
  isPending,
  onAccept,
}: SuggestionsPanelProps) {
  if (!visible) return null;

  return (
    <Card className="space-y-1 bg-background/80 p-2">
      <div className="text-[0.65rem] font-medium uppercase text-muted-foreground">
        Suggested next steps
      </div>
      {isSuggestionsPending && (
        <div className="text-[11px] text-muted-foreground">Generating suggestions...</div>
      )}
      {isSuggestionsError && (
        <div className="text-[11px] text-destructive">
          {suggestionsError instanceof Error ? suggestionsError.message : "Unable to load suggestions."}
        </div>
      )}
      {!isSuggestionsPending && !isSuggestionsError && safeSuggestions.length > 0 && (
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {safeSuggestions.map((suggestion: any) => {
            const title = suggestion.title;
            const tooltip = suggestion.detailedSuggestion ?? suggestion.title ?? "";
            return (
              <Button
                key={suggestion?.id ?? title}
                variant="outline"
                size="xs"
                className="h-6 rounded-full text-[11px] shrink-0"
                onClick={() => onAccept(suggestion)}
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
        <div className="text-[11px] text-muted-foreground">No suggestions yet.</div>
      )}
    </Card>
  );
}
