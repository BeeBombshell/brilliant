import { z } from 'zod';
import { 
    ScheduleBlockSchema, 
    EventCardSchema, 
    WeekScheduleSchema, 
} from './schemas';
import type { TimeBlockType } from './schemas';

// --- Main Exports ---

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
