import { z } from 'zod';

// Define the type for the time block types to ensure consistency
export const TimeBlockTypeEnum = z.enum(['deep-work', 'meeting', 'email', 'break']);
export type TimeBlockType = z.infer<typeof TimeBlockTypeEnum>;

// Recurrence Rule Schema for recurring events
export const RecurrenceRuleSchema = z.object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).describe('Recurrence frequency'),
    count: z.number().optional().describe('Number of occurrences (e.g., 10 for 10 times)'),
    endDate: z.string().optional().describe('End date for recurrence in ISO format'),
    interval: z.number().optional().default(1).describe('Interval between occurrences (e.g., 2 for every 2 weeks)'),
    byDay: z.array(z.string()).optional().describe('Specific days for weekly recurrence (e.g., ["MO", "WE", "FR"])'),
}).describe('Recurrence pattern for repeating events');


// --- Component Props Schemas ---

export const ScheduleBlockSchema = z.object({
    title: z.string().describe('Name of the activity or task'),
    startTime: z.string().describe('Start time in ISO format'),
    endTime: z.string().describe('End time in ISO format'),
    type: TimeBlockTypeEnum.describe('Type of time block'),
    description: z.string().optional().describe('Additional details about the block'),
});

export const EventCardSchema = z.object({
    title: z.string().describe('Event title'),
    startDate: z.string().describe('Start date/time in ISO format'),
    endDate: z.string().describe('End date/time in ISO format'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('List of attendees'),
});

export const WeekScheduleSchema = z.object({
    weekStart: z.string().describe('Start of the week in ISO format'),
    blocks: z.array(z.object({
        day: z.string(),
        title: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        type: TimeBlockTypeEnum,
    })).describe('Array of time blocks for the week'),
});

// --- Tool Input Schemas ---

export const CreateEventSchema = z.object({
    summary: z.string().describe('Event title'),
    startDateTime: z.string().describe('Start date/time in ISO format'),
    endDateTime: z.string().describe('End date/time in ISO format'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('Email addresses of attendees'),
    recurrence: RecurrenceRuleSchema.optional().describe('Recurrence pattern for repeating events'),
});

export const GetEventsSchema = z.object({
    startDate: z.string().describe('Start date in ISO format'),
    endDate: z.string().describe('End date in ISO format'),
});

export const UpdateEventSchema = z.object({
    id: z.string().describe('ID of the event to update'),
    title: z.string().optional().describe('New event title'),
    startDate: z.string().optional().describe('New start date/time in ISO format'),
    endDate: z.string().optional().describe('New end date/time in ISO format'),
    description: z.string().optional().describe('New event description'),
    color: z.enum(['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'gray']).optional().describe('Event color'),
    recurrence: RecurrenceRuleSchema.optional().describe('Update recurrence pattern (omit to remove recurrence)'),
});

export const DeleteEventSchema = z.object({
    id: z.string().describe('ID of the event to delete'),
});

export const CreateRecurringEventSchema = z.object({
    summary: z.string().describe('Event title'),
    startDateTime: z.string().describe('Start date/time in ISO format for the FIRST occurrence'),
    endDateTime: z.string().describe('End date/time in ISO format for the FIRST occurrence'),
    recurrence: RecurrenceRuleSchema.describe('Recurrence pattern - REQUIRED. Specify frequency (DAILY/WEEKLY/MONTHLY/YEARLY), optional count, endDate, interval, and byDay'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    color: z.enum(['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'gray']).optional().describe('Event color'),
});

export const CreateRecurringEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    eventId: z.string().optional(),
});

export const ReorganizeEventsSchema = z.object({
    actions: z.array(z.discriminatedUnion('type', [
        z.object({
            type: z.literal('create'),
            event: CreateEventSchema
        }),
        z.object({
            type: z.literal('update'),
            patch: UpdateEventSchema
        }),
        z.object({
            type: z.literal('delete'),
            id: z.string()
        }),
    ])).describe('Array of actions to apply to the calendar'),
    explanation: z.string().optional().describe('Brief explanation of the reorganization logic'),
});

// --- Tool Output Schemas ---

export const CreateEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    eventId: z.string().optional(),
});

export const GetEventsOutputSchema = z.object({
    success: z.boolean(),
    events: z.array(z.any()),
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
