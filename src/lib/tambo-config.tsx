import { z } from 'zod';

// Define the type for the time block types to ensure consistency
const TimeBlockTypeEnum = z.enum(['deep-work', 'meeting', 'email', 'break']);
type TimeBlockType = z.infer<typeof TimeBlockTypeEnum>;

// --- Component Props Schemas ---

const ScheduleBlockSchema = z.object({
    title: z.string().describe('Name of the activity or task'),
    startTime: z.string().describe('Start time in ISO format'),
    endTime: z.string().describe('End time in ISO format'),
    type: TimeBlockTypeEnum.describe('Type of time block'),
    description: z.string().optional().describe('Additional details about the block'),
});

const EventCardSchema = z.object({
    title: z.string().describe('Event title'),
    startDate: z.string().describe('Start date/time in ISO format'),
    endDate: z.string().describe('End date/time in ISO format'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('List of attendees'),
});

const WeekScheduleSchema = z.object({
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

const CreateEventSchema = z.object({
    summary: z.string().describe('Event title'),
    startDateTime: z.string().describe('Start date/time in ISO format'),
    endDateTime: z.string().describe('End date/time in ISO format'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    attendees: z.array(z.string()).optional().describe('Email addresses of attendees'),
});

const GetEventsSchema = z.object({
    startDate: z.string().describe('Start date in ISO format'),
    endDate: z.string().describe('End date in ISO format'),
});

const SuggestBlocksSchema = z.object({
    goals: z.string().describe('User\'s goals or preferences'),
    numberOfBlocks: z.number().optional().describe('Number of time blocks to suggest'),
    blockDuration: z.number().optional().describe('Duration of each block in minutes'),
});

// --- Tool Output Schemas ---

const CreateEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    eventId: z.string(),
});

const GetEventsOutputSchema = z.object({
    success: z.boolean(),
    events: z.array(z.any()),
    message: z.string(),
});

const SuggestBlocksOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    blocks: z.array(z.any()),
});

// --- Main Exports ---

// Define your calendar-related components that Tambo can render
export const tamboComponents = [
    {
        name: 'ScheduleBlock',
        description: 'Display a time block for focused work or activities',
        component: ScheduleBlock,
        propsSchema: ScheduleBlockSchema,
    },
    {
        name: 'EventCard',
        description: 'Display a calendar event with details',
        component: EventCard,
        propsSchema: EventCardSchema,
    },
    {
        name: 'WeekSchedule',
        description: 'Display a full week schedule with multiple time blocks',
        component: WeekSchedule,
        propsSchema: WeekScheduleSchema,
    }
];

// Define tools that Tambo can use to interact with your calendar
export const tamboTools = [
    {
        name: 'createCalendarEvent',
        title: 'Create Calendar Event',
        description: 'Create a new event in the user\'s Google Calendar',
        inputSchema: CreateEventSchema,
        outputSchema: CreateEventOutputSchema,
        tool: async ({ summary, startDateTime, endDateTime, description, location, attendees }: z.infer<typeof CreateEventSchema>) => {
            console.log('Creating event:', { summary, startDateTime, endDateTime, description, location, attendees });

            return {
                success: true,
                message: `Created event "${summary}" from ${new Date(startDateTime).toLocaleString()} to ${new Date(endDateTime).toLocaleString()}${location ? ` at ${location}` : ''}`,
                eventId: Math.random().toString(36).substring(7),
            };
        }
    },
    {
        name: 'getCalendarEvents',
        title: 'Get Calendar Events',
        description: 'Retrieve events from the user\'s calendar for a specific time range',
        inputSchema: GetEventsSchema,
        outputSchema: GetEventsOutputSchema,
        tool: async ({ startDate, endDate }: z.infer<typeof GetEventsSchema>) => {
            console.log('Fetching events from', startDate, 'to', endDate);

            return {
                success: true,
                events: [],
                message: `Retrieved events from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
            };
        }
    },
    {
        name: 'suggestTimeBlocks',
        title: 'Suggest Time Blocks',
        description: 'Suggest optimal time blocks based on user goals and existing calendar',
        inputSchema: SuggestBlocksSchema,
        outputSchema: SuggestBlocksOutputSchema,
        tool: async ({ goals, numberOfBlocks = 3, blockDuration = 90 }: z.infer<typeof SuggestBlocksSchema>) => {
            console.log('Suggesting time blocks for:', goals, 'count:', numberOfBlocks, 'duration:', blockDuration);

            return {
                success: true,
                message: `Suggested ${numberOfBlocks} time blocks for: ${goals}`,
                blocks: [],
            };
        }
    }
];

// Example component for ScheduleBlock
export function ScheduleBlock({ title, startTime, endTime, type, description }: z.infer<typeof ScheduleBlockSchema>) {
    const typeColors: Record<TimeBlockType, string> = {
        'deep-work': 'bg-blue-100 border-blue-300 text-blue-900',
        'meeting': 'bg-purple-100 border-purple-300 text-purple-900',
        'email': 'bg-green-100 border-green-300 text-green-900',
        'break': 'bg-gray-100 border-gray-300 text-gray-900',
    };

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    return (
        <div className={`rounded-lg border-2 p-4 ${typeColors[type]}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm opacity-75">
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                        {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="ml-2">({duration} min)</span>
                    </p>
                    {description && (
                        <p className="mt-2 text-sm">{description}</p>
                    )}
                </div>
                <span className="rounded-full bg-white/50 px-2 py-1 text-xs font-medium capitalize">
                    {type.replace('-', ' ')}
                </span>
            </div>
        </div>
    );
}

// Example component for EventCard
export function EventCard({ title, startDate, endDate, location, attendees }: z.infer<typeof EventCardSchema>) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">{title}</h3>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>📅 {start.toLocaleDateString()}</p>
                <p>
                    {/* eslint-disable-next-line @typescript-eslint/no-irregular-whitespace */}
                    🕐 {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                    {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {location && <p>📍 {location}</p>}
                {attendees && attendees.length > 0 && (
                    <p>👥 {attendees.join(', ')}</p>
                )}
            </div>
        </div>
    );
}

// Example component for WeekSchedule
export function WeekSchedule({ weekStart, blocks }: z.infer<typeof WeekScheduleSchema>) {
    const week = new Date(weekStart);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">
                Week of {week.toLocaleDateString()}
            </h3>
            <div className="space-y-2">
                {blocks.map((block, idx) => (
                    <ScheduleBlock
                        key={idx}
                        title={block.title}
                        startTime={block.startTime}
                        endTime={block.endTime}
                        type={block.type as TimeBlockType}
                    />
                ))}
            </div>
        </div>
    );
}
