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

    // Ensure at least 30 minutes
    if (end <= start) {
      end.setMinutes(start.getMinutes() + 30);
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New event</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Title
            </label>
            <Input
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Deep work block"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Description
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Optional details, goals, or links…"
            />
          </div>
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium">
                Start Date
              </label>
              <Input
                type="datetime-local"
                value={startInput}
                onChange={event => setStartInput(event.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium">
                End Date
              </label>
              <Input
                type="datetime-local"
                value={endInput}
                onChange={event => setEndInput(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Color
            </label>
            <Select value={color} onValueChange={value => setColor(value as EventColor)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-blue-600" />
                    Blue
                  </div>
                </SelectItem>
                <SelectItem value="green">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-green-600" />
                    Green
                  </div>
                </SelectItem>
                <SelectItem value="red">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-red-600" />
                    Red
                  </div>
                </SelectItem>
                <SelectItem value="yellow">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-yellow-600" />
                    Yellow
                  </div>
                </SelectItem>
                <SelectItem value="purple">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-purple-600" />
                    Purple
                  </div>
                </SelectItem>
                <SelectItem value="orange">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-orange-600" />
                    Orange
                  </div>
                </SelectItem>
                <SelectItem value="gray">
                  <div className="flex items-center gap-2">
                    <div className="size-3.5 rounded-full bg-neutral-600" />
                    Gray
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

