import { useState, useEffect } from "react";
import { format, parseISO, formatISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import type { EventColor } from "@/types/calendar";
import { useAtom } from "jotai";
import { selectedEventIdAtom, eventsAtom } from "@/state/calendarAtoms";

interface EventDetailsDialogProps {
  onClose?: () => void;
}

const colorLabels: Record<string, { name: string; class: string }> = {
  blue: { name: "Sky Blue", class: "bg-sky-500" },
  green: { name: "Emerald", class: "bg-emerald-500" },
  red: { name: "Rose", class: "bg-rose-500" },
  yellow: { name: "Amber", class: "bg-amber-500" },
  purple: { name: "Violet", class: "bg-violet-500" },
  orange: { name: "Orange", class: "bg-orange-500" },
  gray: { name: "Slate", class: "bg-slate-500" },
};

export function EventDetailsDialog({ onClose }: EventDetailsDialogProps = {}) {
  const [selectedEventId, setSelectedEventId] = useAtom(selectedEventIdAtom);
  const [events] = useAtom(eventsAtom);
  const event = events.find((e) => e.id === selectedEventId) || null;
  const open = !!selectedEventId;

  const { updateEvent, deleteEvent } = useCalendarActions();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [color, setColor] = useState<EventColor>("blue");
  const [titleError, setTitleError] = useState("");

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

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartInput(toLocalInputValue(event.startDate));
      setEndInput(toLocalInputValue(event.endDate));
      setColor(event.color);
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setTitleError("");
    }
  }, [event]);

  if (!event) return null;

  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const colorInfo = colorLabels[event.color] || colorLabels.blue;

  const handleClose = () => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSelectedEventId(null);
    onClose?.();
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError("Event title is required");
      return;
    }
    setTitleError("");

    const startFromInput = fromLocalInputValue(startInput);
    const endFromInput = fromLocalInputValue(endInput);

    if (!startFromInput || !endFromInput) return;

    // Ensure end is after start (default to 30 minutes if not)
    let finalEnd = endFromInput;
    if (endFromInput <= startFromInput) {
      finalEnd = new Date(startFromInput.getTime() + 30 * 60000);
    }

    updateEvent(event.id, (prev) => ({
      ...prev,
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: formatISO(startFromInput),
      endDate: formatISO(finalEnd),
      color,
      meta: { ...prev.meta, source: "user" }
    }));

    handleClose();
  };

  const handleDelete = () => {
    deleteEvent(event.id);
    handleClose();
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={(openValue) => !openValue && handleClose()}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              {isEditing ? (
                <span className="flex-1 text-xl">Edit Event</span>
              ) : (
                <>
                  <span className="flex-1">{event.title}</span>
                  <div className="flex items-center gap-2">
                    <div className={`size-3.5 rounded-full ${colorInfo.class}`} />
                    <span className="text-sm font-normal text-muted-foreground">
                      {colorInfo.name}
                    </span>
                  </div>
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {isEditing ? "Edit event details" : `Event details for ${event.title}`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isEditing ? (
            // Edit Mode
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
                  onChange={e => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError("");
                  }}
                  placeholder="e.g., Team Standup, Client Call, Deep Work"
                  className="text-base"
                  aria-invalid={!!titleError}
                />
                {titleError && (
                  <p className="text-sm text-destructive">{titleError}</p>
                )}
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
                  onChange={e => setDescription(e.target.value)}
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
                    onChange={e => setStartInput(e.target.value)}
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
                    onChange={e => setEndInput(e.target.value)}
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
          ) : (
            // View Mode
            <div className="space-y-4 py-4">
              {/* Time Information */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mt-0.5 text-muted-foreground"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">Start:</span>
                      <span className="text-sm text-muted-foreground">
                        {format(startDate, "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="mt-0.5 text-muted-foreground"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" x2="8" y1="13" y2="13" />
                      <line x1="16" x2="8" y1="17" y2="17" />
                      <line x1="10" x2="8" y1="9" y2="9" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Badge */}
              {event.meta?.source && (
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs">
                    {event.meta.source === "ai"
                      ? "AI Generated"
                      : event.meta.source === "system"
                        ? "Google Calendar"
                        : "User Created"}
                  </Badge>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            {isEditing ? (
              <>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Event
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
