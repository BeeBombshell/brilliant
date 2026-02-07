import { useEffect, useState } from "react";
import { formatISO, addDays, startOfDay, endOfDay } from "date-fns";
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
import { Switch } from "@/components/ui/switch";
import { newEventDraftAtom } from "@/state/calendarAtoms";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import { dateTimeHelpers, eventColorConfig } from "@/lib/calendarUtils";
import { useEventForm } from "@/hooks/useEventForm";
import type { EventColor, RecurrenceRule } from "@/types/calendar";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { IconClock, IconEdit, IconFileText, IconPalette, IconRepeat } from "@tabler/icons-react";

export function NewEventDialog() {
  const [draft, setDraft] = useAtom(newEventDraftAtom);
  const { addEvent } = useCalendarActions();
  const form = useEventForm();
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceRule["frequency"]>("WEEKLY");
  const [recurrenceCount, setRecurrenceCount] = useState<string>("10");
  const { user } = useGoogleAuth();
  const [meetingLinkRequested, setMeetingLinkRequested] = useState(false);

  useEffect(() => {
    if (draft) {
      form.setTitle("");
      form.setDescription("");
      form.setMeetingLink("");
      form.setStartInput(dateTimeHelpers.toLocalInputValue(draft.startDate));
      form.setEndInput(dateTimeHelpers.toLocalInputValue(draft.endDate));
      form.setColor("blue");
      form.setTitleError("");
      setRecurrenceEnabled(false);
      setRecurrenceFrequency("WEEKLY");
      setRecurrenceCount("10");
      setMeetingLinkRequested(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const open = !!draft;

  if (!draft) return null;

  const handleClose = () => setDraft(null);

  const handleMakeMultiDay = (days: number) => {
    if (!form.startInput) {
      return;
    }
    const start = dateTimeHelpers.fromLocalInputValue(form.startInput);
    if (!start) {
      return;
    }

    const existingEnd = dateTimeHelpers.fromLocalInputValue(form.endInput);
    const base = existingEnd && existingEnd > start ? existingEnd : start;
    const newEnd = addDays(base, days);
    const newEndInput = dateTimeHelpers.toLocalInputValue(formatISO(newEnd));
    form.setEndInput(newEndInput);
  };

  const handleMakeAllDay = () => {
    if (!form.startInput) return;
    const start = dateTimeHelpers.fromLocalInputValue(form.startInput);
    if (!start) return;

    const dayStart = startOfDay(start);
    const dayEnd = endOfDay(start);

    form.setStartInput(dateTimeHelpers.toLocalInputValue(formatISO(dayStart)));
    form.setEndInput(dateTimeHelpers.toLocalInputValue(formatISO(dayEnd)));
  };

  const handleCreate = () => {
    const data = form.validateAndGetData();
    if (!data) return;

    const newEvent = {
      ...data,
      meta: { source: "user" as const },
      meetingLinkRequested,
      organizer: user?.email || user?.name ? {
        name: user?.name,
        email: user?.email,
        self: true,
      } : undefined,
      ...(recurrenceEnabled && {
        recurrence: {
          frequency: recurrenceFrequency,
          count: recurrenceCount ? parseInt(recurrenceCount, 10) : undefined,
          interval: 1,
        } satisfies RecurrenceRule,
      }),
    };

    addEvent(newEvent);
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
              <IconEdit size={16} />
              Event Title
            </label>
            <Input
              autoFocus
              value={form.title}
              onChange={event => {
                form.setTitle(event.target.value);
                if (form.titleError) form.setTitleError("");
              }}
              placeholder="e.g., Team Standup, Client Call, Deep Work"
              className="text-base"
              aria-invalid={!!form.titleError}
            />
            {form.titleError && (
              <p className="text-sm text-destructive">{form.titleError}</p>
            )}
          </div>
          <div className="space-y-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <IconFileText size={16} />
              Description
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={event => form.setDescription(event.target.value)}
              placeholder="Add notes, agenda items, meeting links..."
              className="resize-none"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <IconClock size={16} />
                Date & Time
              </label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleMakeAllDay}
                  className="h-7 text-xs"
                >
                  All-day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMakeMultiDay(1)}
                  className="h-7 text-xs"
                >
                  +1 day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMakeMultiDay(2)}
                  className="h-7 text-xs"
                >
                  +2 days
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Start</label>
                <Input
                  type="datetime-local"
                  value={form.startInput}
                  onChange={event => form.setStartInput(event.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">End</label>
                <Input
                  type="datetime-local"
                  value={form.endInput}
                  onChange={event => form.setEndInput(event.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <IconRepeat size={16} />
              Repeat
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={recurrenceEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setRecurrenceEnabled(!recurrenceEnabled)}
                className="h-8"
              >
                {recurrenceEnabled ? "Repeating" : "No repeat"}
              </Button>
              {recurrenceEnabled && (
                <Select value={recurrenceFrequency} onValueChange={v => setRecurrenceFrequency(v as RecurrenceRule["frequency"])}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {recurrenceEnabled && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={recurrenceCount}
                    onChange={e => setRecurrenceCount(e.target.value)}
                    className="h-8 w-16 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">times</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Add Google Meet link</p>
                <p className="text-xs text-muted-foreground">
                  Create a meeting link through Google Calendar
                </p>
              </div>
              <Switch
                checked={meetingLinkRequested}
                onCheckedChange={setMeetingLinkRequested}
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <IconPalette size={16} />
              Event Color
            </label>
            <Select value={form.color} onValueChange={value => form.setColor(value as EventColor)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose event color" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventColorConfig).map(([colorKey, { name, class: colorClass }]) => (
                  <SelectItem key={colorKey} value={colorKey}>
                    <div className="flex items-center gap-2">
                      <div className={`size-3.5 rounded-full ${colorClass}`} />
                      {name}
                    </div>
                  </SelectItem>
                ))}
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

