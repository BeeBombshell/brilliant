import { 
    ScheduleBlock, 
    EventCard, 
    WeekSchedule 
} from './components';
import { 
    ScheduleBlockSchema, 
    EventCardSchema, 
    WeekScheduleSchema 
} from './schemas';

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
