import { z } from 'zod';
import { EventMetadataSchema } from './contact.schema';

// Meeting completed payload schema
export const MeetingCompletedPayloadSchema = z.object({
  activityId: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  meetingType: z.enum(['in_person', 'video', 'phone']),
  duration: z.number(), // minutes
  outcome: z.enum(['positive', 'neutral', 'negative']).optional(),
  notes: z.string().optional(),
  completedAt: z.date(),
  attendees: z.array(z.string()).optional(),
});

export const MeetingCompletedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('activity.meeting_completed'),
  payload: MeetingCompletedPayloadSchema,
});

// Meeting scheduled payload schema
export const MeetingScheduledPayloadSchema = z.object({
  activityId: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  meetingType: z.enum(['in_person', 'video', 'phone']),
  scheduledFor: z.date(),
  duration: z.number().optional(), // minutes
  attendees: z.array(z.string()).optional(),
});

export const MeetingScheduledEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('activity.meeting_scheduled'),
  payload: MeetingScheduledPayloadSchema,
});

// Call completed payload schema
export const CallCompletedPayloadSchema = z.object({
  activityId: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  duration: z.number(), // seconds
  outcome: z
    .enum(['positive', 'neutral', 'negative', 'no_answer'])
    .optional(),
  notes: z.string().optional(),
  completedAt: z.date(),
});

export const CallCompletedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('activity.call_completed'),
  payload: CallCompletedPayloadSchema,
});

// Task created payload schema
export const TaskCreatedPayloadSchema = z.object({
  activityId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  dueDate: z.date().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const TaskCreatedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('activity.task_created'),
  payload: TaskCreatedPayloadSchema,
});

// Inactivity detected payload schema
export const InactivityDetectedPayloadSchema = z.object({
  entityType: z.enum(['contact', 'deal', 'company']),
  entityId: z.string(),
  lastActivityDate: z.date(),
  daysSinceLastActivity: z.number(),
  activityCount: z.number(),
  assignedTo: z.string().optional(),
});

export const InactivityDetectedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('activity.inactivity_detected'),
  payload: InactivityDetectedPayloadSchema,
});
