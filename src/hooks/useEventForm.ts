import { useState } from 'react';
import { formatISO } from 'date-fns';
import type { CalendarEvent, EventColor } from '@/types/calendar';
import { dateTimeHelpers } from '@/lib/calendarUtils';

export function useEventForm(initialEvent?: CalendarEvent) {
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [meetingLink, setMeetingLink] = useState(initialEvent?.meetingLink ?? '');
  const [startInput, setStartInput] = useState(
    initialEvent ? dateTimeHelpers.toLocalInputValue(initialEvent.startDate) : ''
  );
  const [endInput, setEndInput] = useState(
    initialEvent ? dateTimeHelpers.toLocalInputValue(initialEvent.endDate) : ''
  );
  const [color, setColor] = useState<EventColor>(initialEvent?.color ?? 'blue');
  const [titleError, setTitleError] = useState('');

  function validateAndGetData() {
    if (!title.trim()) {
      setTitleError('Event title is required');
      return null;
    }
    setTitleError('');

    const start = dateTimeHelpers.fromLocalInputValue(startInput);
    const end = dateTimeHelpers.fromLocalInputValue(endInput);

    if (!start || !end) return null;

    const { start: validStart, end: validEnd } = dateTimeHelpers.ensureValidTimeRange(start, end);

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
      color,
      startDate: formatISO(validStart),
      endDate: formatISO(validEnd),
    };
  }

  return {
    title, setTitle,
    description, setDescription,
    meetingLink, setMeetingLink,
    startInput, setStartInput,
    endInput, setEndInput,
    color, setColor,
    titleError, setTitleError,
    validateAndGetData,
  };
}
