import { useEffect, useState } from "react";
import { parseISO, formatISO } from "date-fns";
import { useAtom } from "jotai";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { newEventDraftAtom } from "@/state/calendarAtoms";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import type { EventColor } from "@/types/calendar";

export function NewEventDialog() {
  const [draft, setDraft] = useAtom(newEventDraftAtom);
  const { addEvent } = useCalendarActions();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [color, setColor] = useState<EventColor>("blue");

  const toLocalInputValue = (iso: string) => {
    const date = parseISO(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const fromLocalInputValue = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    if (draft) {
      setTitle("");
      setDescription("");
      setStartInput(toLocalInputValue(draft.startDate));
      setEndInput(toLocalInputValue(draft.endDate));
      setColor("blue");
    }
  }, [draft]);

  const open = !!draft;

  if (!draft) return null;

  const handleClose = () => setDraft(null);

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }

    const startFromInput = fromLocalInputValue(startInput);
    const endFromInput = fromLocalInputValue(endInput);

    const start = startFromInput ?? parseISO(draft.startDate);
    const end = endFromInput ?? parseISO(draft.endDate);

    // Ensure end is after start (default to 15 minutes if not)
    if (end <= start) {
      end.setMinutes(start.getMinutes() + 15);
    }

    addEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: formatISO(start),
      endDate: formatISO(end),
      color,
      meta: { source: "user" },
    });

    setDraft(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={openValue => !openValue && handleClose()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Create New Event</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-5 py-4">
          <div className="space-y-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
              Event Title
            </label>
            <Input
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="e.g., Team Standup, Client Call, Deep Work"
              className="text-base"
            />
          </div>
          <div className="space-y-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Description
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Add notes, agenda items, meeting links..."
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Start
              </label>
              <Input
                type="datetime-local"
                value={startInput}
                onChange={event => setStartInput(event.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                End
              </label>
              <Input
                type="datetime-local"
                value={endInput}
                onChange={event => setEndInput(event.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
              Event Color
            </label>
            <Select value={color} onValueChange={value => setColor(value as EventColor)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose event color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-sky-500" />
                    Sky Blue
                  </div>
                </SelectItem>
                <SelectItem value="green">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-emerald-500" />
                    Emerald
                  </div>
                </SelectItem>
                <SelectItem value="red">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-rose-500" />
                    Rose
                  </div>
                </SelectItem>
                <SelectItem value="yellow">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-amber-500" />
                    Amber
                  </div>
                </SelectItem>
                <SelectItem value="purple">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-violet-500" />
                    Violet
                  </div>
                </SelectItem>
                <SelectItem value="orange">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-orange-500" />
                    Orange
                  </div>
                </SelectItem>
                <SelectItem value="gray">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-slate-500" />
                    Slate
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate}>
            Create
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

