import type React from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  IconSend,
  IconMicrophone,
  IconPlayerStop,
} from "@tabler/icons-react";
import { useTamboVoice } from "@tambo-ai/react";

interface MessageBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageBox({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything",
  disabled = false,
}: MessageBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTranscriptRef = useRef<string | null>(null);
  const enableVoiceInput = false;
  const {
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
    transcript,
    transcriptionError,
    mediaAccessError,
  } = useTamboVoice();
  const isExpanded = value.length > 100 || value.includes("\n");

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

  }, [value]);

  useEffect(() => {
    const nextTranscript = transcript?.trim();
    if (!nextTranscript || disabled) return;
    if (isRecording || isTranscribing) return;
    if (lastTranscriptRef.current === nextTranscript) return;

    const trimmedValue = value.trim();
    const combined = trimmedValue ? `${trimmedValue}\n${nextTranscript}` : nextTranscript;
    onChange(combined);
    lastTranscriptRef.current = nextTranscript;
  }, [transcript, disabled, isRecording, isTranscribing, onChange, value]);

  const gridTemplateAreas = isExpanded
    ? '"header" "primary" "footer"'
    : '"header header header" "leading primary trailing" ". footer ."';

  return (
    <form onSubmit={handleSubmit} className="group/composer w-full">
      <div
        className={cn(
          "w-full bg-transparent dark:bg-muted/50 cursor-text overflow-clip bg-clip-padding p-2.5 shadow-lg border border-border transition-[border-radius] duration-200 ease-out",
          isExpanded
            ? "rounded-3xl grid grid-cols-[1fr] grid-rows-[auto_1fr_auto]"
            : "rounded-3xl grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto]"
        )}
        style={{ gridTemplateAreas }}
      >
        <div
          className={cn(
            "flex min-h-14 items-center overflow-x-hidden px-1.5",
            {
              "px-2 py-1 mb-0": isExpanded,
              "-my-2.5": !isExpanded,
            }
          )}
          style={{ gridArea: "primary" }}
        >
          <div className="flex-1 overflow-auto max-h-52">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-0 resize-none rounded-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin dark:bg-transparent"
              rows={1}
              disabled={disabled}
            />
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          style={{ gridArea: isExpanded ? "footer" : "trailing" }}
        >
          <div className="ms-auto flex items-center gap-1.5">
            {enableVoiceInput && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("rounded-full", isRecording && "text-destructive")}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled || isTranscribing}
              >
                {isRecording ? <IconPlayerStop className="size-5" /> : <IconMicrophone className="size-5" />}
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              aria-label="Send message"
              disabled={disabled || !value.trim()}
            >
              <IconSend className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      {enableVoiceInput && (isTranscribing || transcriptionError || mediaAccessError) && (
        <div className="px-2 pt-1 text-[10px] text-muted-foreground">
          {isTranscribing && "Transcribing voice input..."}
          {!isTranscribing && (transcriptionError || mediaAccessError)}
        </div>
      )}
    </form>
  );
}
