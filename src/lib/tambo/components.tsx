// import { z } from 'zod';
// import {
//     ScheduleBlockSchema,
//     EventCardSchema,
//     WeekScheduleSchema,
// } from './schemas';
// import type { TimeBlockType } from './schemas';

// Re-export GenerativeForm for Tambo registration
export { GenerativeForm } from '@/components/generative/GenerativeForm';

// --- Main Exports ---

// Example component for ScheduleBlock
// export function ScheduleBlock({ title, startTime, endTime, type, description }: z.infer<typeof ScheduleBlockSchema>) {
//     const typeColors: Record<string, string> = {
//         'deep-work': 'bg-blue-100 border-blue-300 text-blue-900',
//         'meeting': 'bg-purple-100 border-purple-300 text-purple-900',
//         'email': 'bg-green-100 border-green-300 text-green-900',
//         'break': 'bg-gray-100 border-gray-300 text-gray-900',
//     };
//
//     // Guard against undefined props during streaming
//     if (!title && !startTime) {
//         return (
//             <div className="rounded-lg border-2 p-4 bg-gray-100 border-gray-300 animate-pulse">
//                 <div className="h-5 w-32 bg-muted rounded" />
//                 <div className="h-4 w-48 bg-muted rounded mt-2" />
//             </div>
//         );
//     }
//
//     const start = startTime ? new Date(startTime) : null;
//     const end = endTime ? new Date(endTime) : null;
//     const duration = start && end ? Math.round((end.getTime() - start.getTime()) / (1000 * 60)) : 0;
//     const colorClass = typeColors[type ?? 'break'] ?? typeColors['break'];
//
//     return (
//         <div className={`rounded-lg border-2 p-4 ${colorClass}`}>
//             <div className="flex items-start justify-between">
//                 <div className="flex-1">
//                     <h3 className="font-semibold">{title ?? 'Untitled'}</h3>
//                     <p className="text-sm opacity-75">
//                         {start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'} -
//                         {end?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'}
//                         {duration > 0 && <span className="ml-2">({duration} min)</span>}
//                     </p>
//                     {description && (
//                         <p className="mt-2 text-sm">{description}</p>
//                     )}
//                 </div>
//                 <span className="rounded-full bg-white/50 px-2 py-1 text-xs font-medium capitalize">
//                     {(type ?? 'break').replace('-', ' ')}
//                 </span>
//             </div>
//         </div>
//     );
// }

// Example component for EventCard
// export function EventCard({ title, startDate, endDate, location, attendees }: z.infer<typeof EventCardSchema>) {
//     // Guard against undefined props during streaming
//     if (!title && !startDate) {
//         return (
//             <div className="rounded-lg border bg-card p-4 shadow-sm animate-pulse">
//                 <div className="h-5 w-40 bg-muted rounded" />
//                 <div className="h-4 w-32 bg-muted rounded mt-2" />
//             </div>
//         );
//     }
//
//     const start = startDate ? new Date(startDate) : null;
//     const end = endDate ? new Date(endDate) : null;
//
//     return (
//         <div className="rounded-lg border bg-card p-4 shadow-sm">
//             <h3 className="font-semibold">{title ?? 'Untitled Event'}</h3>
//             <div className="mt-2 space-y-1 text-sm text-muted-foreground">
//                 <p>📅 {start?.toLocaleDateString() ?? '—'}</p>
//                 <p>
//                     🕐 {start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'} -
//                     {end?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—'}
//                 </p>
//                 {location && <p>📍 {location}</p>}
//                 {attendees && attendees.length > 0 && (
//                     <p>👥 {attendees.join(', ')}</p>
//                 )}
//             </div>
//         </div>
//     );
// }

// Example component for WeekSchedule
// export function WeekSchedule({ weekStart, blocks }: z.infer<typeof WeekScheduleSchema>) {
//     // Guard against undefined props during streaming
//     if (!weekStart && !blocks) {
//         return (
//             <div className="space-y-4 animate-pulse">
//                 <div className="h-6 w-48 bg-muted rounded" />
//                 <div className="space-y-2">
//                     {[1, 2, 3].map((i) => (
//                         <div key={i} className="h-16 bg-muted rounded-lg" />
//                     ))}
//                 </div>
//             </div>
//         );
//     }
//
//     const week = weekStart ? new Date(weekStart) : new Date();
//
//     return (
//         <div className="space-y-4">
//             <h3 className="text-lg font-semibold">
//                 Week of {week.toLocaleDateString()}
//             </h3>
//             <div className="space-y-2">
//                 {blocks?.map((block, idx) => (
//                     <ScheduleBlock
//                         key={idx}
//                         title={block.title}
//                         startTime={block.startTime}
//                         endTime={block.endTime}
//                         type={block.type as TimeBlockType}
//                     />
//                 ))}
//             </div>
//         </div>
//     );
// }
