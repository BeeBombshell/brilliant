import { z } from "zod";

// Re-export form schemas from the generative form component
export {
  FormFieldSchema,
  GenerativeFormSchema,
} from "@/components/generative/GenerativeForm";

// Recurrence Rule Schema for recurring events
export const RecurrenceRuleSchema = z
  .object({
    frequency: z
      .enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .describe("Recurrence frequency"),
    count: z
      .number()
      .optional()
      .describe("Number of occurrences (e.g., 10 for 10 times)"),
    endDate: z
      .string()
      .optional()
      .describe("End date for recurrence in ISO format"),
    interval: z
      .number()
      .optional()
      .default(1)
      .describe("Interval between occurrences (e.g., 2 for every 2 weeks)"),
    byDay: z
      .array(z.string())
      .optional()
      .describe(
        'Specific days for weekly recurrence (e.g., ["MO", "WE", "FR"])',
      ),
  })
  .describe("Recurrence pattern for repeating events");

// --- Tool Input Schemas ---

export const CreateEventSchema = z.object({
  summary: z.string().describe("Event title"),
  startDateTime: z.string().describe("Start date/time in ISO format"),
  endDateTime: z.string().describe("End date/time in ISO format"),
  description: z.string().optional().describe("Event description"),
  location: z.string().optional().describe("Event location"),
  attendees: z
    .array(z.string())
    .optional()
    .describe("Email addresses of attendees"),
  color: z
    .enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"])
    .optional()
    .describe("Event color"),
  meetingLinkRequested: z
    .boolean()
    .optional()
    .describe("If true, create a Google Meet link via Google Calendar"),
  recurrence: RecurrenceRuleSchema.optional().describe(
    "Recurrence pattern for repeating events",
  ),
});

export const GetEventsSchema = z.object({
  startDate: z
    .string()
    .describe(
      'Start date/time in full ISO 8601 format with time and timezone, e.g. "2026-02-28T00:00:00+05:30". Always include the time portion — never pass a date-only string like "2026-02-28".',
    ),
  endDate: z
    .string()
    .describe(
      'End date/time in full ISO 8601 format with time and timezone, e.g. "2026-02-28T23:59:59+05:30". Always include the time portion — never pass a date-only string like "2026-02-28".',
    ),
});

export const UpdateEventSchema = z.object({
  id: z.string().describe("ID of the event to update"),
  title: z.string().optional().describe("New event title"),
  startDate: z
    .string()
    .optional()
    .describe("New start date/time in ISO format"),
  endDate: z.string().optional().describe("New end date/time in ISO format"),
  description: z.string().optional().describe("New event description"),
  location: z.string().optional().describe("New event location"),
  attendees: z
    .array(z.string())
    .optional()
    .describe("Email addresses of attendees"),
  color: z
    .enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"])
    .optional()
    .describe("Event color"),
  meetingLinkRequested: z
    .boolean()
    .optional()
    .describe("If true, create a Google Meet link via Google Calendar"),
  recurrence: RecurrenceRuleSchema.optional().describe(
    "Update recurrence pattern (omit to remove recurrence)",
  ),
});

export const DeleteEventSchema = z.object({
  id: z.string().describe("ID of the event to delete"),
});

export const ReorganizeEventsSchema = z.object({
  actions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("create"),
          event: CreateEventSchema,
        }),
        z.object({
          type: z.literal("update"),
          patch: UpdateEventSchema,
        }),
        z.object({
          type: z.literal("delete"),
          id: z.string(),
        }),
      ]),
    )
    .describe("Array of actions to apply to the calendar"),
  explanation: z
    .string()
    .optional()
    .describe("Brief explanation of the reorganization logic"),
});

// --- Tool Output Schemas ---

export const CreateEventOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  eventId: z.string().optional(),
});

export const GetEventsOutputSchema = z.object({
  success: z.boolean(),
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
    }),
  ),
  message: z.string(),
});

export const UpdateEventOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const DeleteEventOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const ReorganizeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  actionCount: z.number(),
});
