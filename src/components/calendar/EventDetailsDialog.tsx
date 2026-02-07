import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
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
import { eventColorConfig, dateTimeHelpers } from "@/lib/calendarUtils";
import { useEventForm } from "@/hooks/useEventForm";
import type { EventColor } from "@/types/calendar";
import { useAtom } from "jotai";
import { selectedEventIdAtom, eventsAtom } from "@/state/calendarAtoms";
import {
  IconClock,
  IconEdit,
  IconFileText,
  IconLink,
  IconMapPin,
  IconPalette,
  IconRepeat,
  IconUsers,
} from "@tabler/icons-react";

interface EventDetailsDialogProps {
  onClose?: () => void;
}

export function EventDetailsDialog({ onClose }: EventDetailsDialogProps = {}) {
  const [selectedEventId, setSelectedEventId] = useAtom(selectedEventIdAtom);
  const [events] = useAtom(eventsAtom);
  const event = events.find((e) => e.id === selectedEventId) || null;
  const open = !!selectedEventId;

  const { updateEvent, deleteEvent } = useCalendarActions();
  const form = useEventForm(event || undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      form.setTitle(event.title);
      form.setDescription(event.description || "");
      form.setMeetingLink(event.meetingLink || "");
      form.setStartInput(dateTimeHelpers.toLocalInputValue(event.startDate));
      form.setEndInput(dateTimeHelpers.toLocalInputValue(event.endDate));
      form.setColor(event.color);
      form.setTitleError("");
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  if (!event) return null;

  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const colorInfo = eventColorConfig[event.color] || eventColorConfig.blue;
  const isMeetingLinkUrl = !!event.meetingLink && /^https?:\/\//i.test(event.meetingLink);

  const handleClose = () => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSelectedEventId(null);
    onClose?.();
  };

  const handleSave = () => {
    const data = form.validateAndGetData();
    if (!data) return;

    updateEvent(event.id, (prev) => ({
      ...prev,
      ...data,
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
                  <IconEdit size={16} />
                  Event Title
                </label>
                <Input
                  autoFocus
                  value={form.title}
                  onChange={e => {
                    form.setTitle(e.target.value);
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
                  onChange={e => form.setDescription(e.target.value)}
                  placeholder="Add notes, agenda items, meeting links..."
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <IconClock size={16} />
                    Start
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.startInput}
                    onChange={e => form.setStartInput(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <IconClock size={16} />
                    End
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.endInput}
                    onChange={e => form.setEndInput(e.target.value)}
                    className="text-sm"
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
          ) : (
            // View Mode
            <div className="space-y-4 py-4">
              {/* Time Information */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <IconClock size={20} className="mt-0.5 text-muted-foreground" />
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
                    <IconFileText size={20} className="mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(event.meetingLink || event.location) && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    {event.meetingLink ? (
                      <IconLink size={20} className="mt-0.5 text-muted-foreground" />
                    ) : (
                      <IconMapPin size={20} className="mt-0.5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">
                        {event.meetingLink ? "Meeting Link" : "Location"}
                      </p>
                      {event.meetingLink ? (
                        isMeetingLinkUrl ? (
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline break-all"
                          >
                            {event.meetingLink}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {event.meetingLink}
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(event.organizer || event.creator || (event.attendees && event.attendees.length > 0)) && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <IconUsers size={20} className="mt-0.5 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      {(event.organizer || event.creator) && (
                        <div>
                          <p className="text-sm font-medium mb-1">Organizer</p>
                          <p className="text-sm text-muted-foreground">
                            {event.organizer?.name || event.creator?.name || event.organizer?.email || event.creator?.email || "Unknown"}
                            {event.organizer?.email && event.organizer?.name ? ` · ${event.organizer.email}` : ""}
                          </p>
                        </div>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Attendees</p>
                          <ul className="space-y-1">
                            {event.attendees.map(attendee => (
                              <li key={attendee.email} className="text-sm text-muted-foreground">
                                {attendee.name || attendee.email}
                                {attendee.responseStatus ? ` · ${attendee.responseStatus}` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                  {(event.recurrence || event.isInstance) && (
                    <Badge variant="secondary" className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        <IconRepeat size={12} />
                        {(() => {
                        const rule = event.recurrence;
                        if (!rule && event.isInstance) return "Recurring instance";
                        if (!rule) return "";
                        const freq = rule.frequency.charAt(0) + rule.frequency.slice(1).toLowerCase();
                        const parts = [freq];
                        if (rule.interval && rule.interval > 1) parts[0] = `Every ${rule.interval} ${freq.toLowerCase()}s`;
                        if (rule.byDay?.length) parts.push(`on ${rule.byDay.join(", ")}`);
                        if (rule.count) parts.push(`(${rule.count}×)`);
                        if (rule.endDate) parts.push(`until ${format(parseISO(rule.endDate), "MMM d, yyyy")}`);
                        return parts.join(" ");
                      })()}
                      </span>
                    </Badge>
                  )}
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
