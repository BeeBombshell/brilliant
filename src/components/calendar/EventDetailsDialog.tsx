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
import type { CalendarEvent } from "@/types/calendar";

interface EventDetailsDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
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

export function EventDetailsDialog({ event, open, onClose }: EventDetailsDialogProps) {
  if (!event) return null;

  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const colorInfo = colorLabels[event.color] || colorLabels.blue;

  return (
    <AlertDialog open={open} onOpenChange={(openValue) => !openValue && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <span className="flex-1">{event.title}</span>
            <div className="flex items-center gap-2">
              <div className={`size-3.5 rounded-full ${colorInfo.class}`} />
              <span className="text-sm font-normal text-muted-foreground">
                {colorInfo.name}
              </span>
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Event details for {event.title}
          </AlertDialogDescription>
        </AlertDialogHeader>

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
                {event.meta.source === "ai" ? "AI Generated" : "User Created"}
              </Badge>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
