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
import { newEventDraftAtom } from "@/state/calendarAtoms";
import { useCalendarActions } from "@/hooks/useCalendarActions";

export function NewEventDialog() {
  const [draft, setDraft] = useAtom(newEventDraftAtom);
  const { addEvent } = useCalendarActions();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (draft) {
      setTitle("");
      setDescription("");
    }
  }, [draft]);

  const open = !!draft;

  if (!draft) return null;

  const handleClose = () => setDraft(null);

  const handleCreate = () => {
    if (!title.trim()) {
      return;
    }

    const start = parseISO(draft.startDate);
    const end = parseISO(draft.endDate);

    // Ensure at least 30 minutes
    if (end <= start) {
      end.setMinutes(start.getMinutes() + 30);
    }

    addEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: formatISO(start),
      endDate: formatISO(end),
      color: "blue",
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
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Title
            </label>
            <Input
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Deep work block"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Optional details, goals, or links…"
            />
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

