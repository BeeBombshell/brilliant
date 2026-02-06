import {
    GenerativeForm,
} from './components';
import {
    GenerativeFormSchema,
} from './schemas';

// Define your calendar-related components that Tambo can render
export const tamboComponents = [
    {
        name: 'GenerativeForm',
        description: 'A dynamic, schema-driven questionnaire / form. Use this when the user asks to create a form, survey, questionnaire, quiz, feedback form, registration form, intake form, application, or any structured data-collection UI. The AI should populate the fields array with the appropriate field types (text, email, number, textarea, select, radio, checkbox, switch, date, time, range, etc.) based on what information needs to be collected. Supports sections, validation, and flexible grid layouts.',
        component: GenerativeForm,
        propsSchema: GenerativeFormSchema,
    },
];
