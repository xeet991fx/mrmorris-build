import { BaseEvent } from './base.types';

// Event type constants
export const ACTIVITY_EVENTS = {
  MEETING_SCHEDULED: 'activity.meeting_scheduled',
  MEETING_COMPLETED: 'activity.meeting_completed',
  MEETING_CANCELLED: 'activity.meeting_cancelled',
  CALL_COMPLETED: 'activity.call_completed',
  TASK_CREATED: 'activity.task_created',
  TASK_COMPLETED: 'activity.task_completed',
  NOTE_ADDED: 'activity.note_added',
  INACTIVITY_DETECTED: 'activity.inactivity_detected',
} as const;

export type ActivityEventType =
  typeof ACTIVITY_EVENTS[keyof typeof ACTIVITY_EVENTS];

// Payload interfaces
export interface MeetingCompletedPayload {
  activityId: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  meetingType: 'in_person' | 'video' | 'phone';
  duration: number; // minutes
  outcome?: 'positive' | 'neutral' | 'negative';
  notes?: string;
  completedAt: Date;
  attendees?: string[];
}

export interface MeetingScheduledPayload {
  activityId: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  meetingType: 'in_person' | 'video' | 'phone';
  scheduledFor: Date;
  duration?: number; // minutes
  attendees?: string[];
}

export interface CallCompletedPayload {
  activityId: string;
  contactId?: string;
  dealId?: string;
  duration: number; // seconds
  outcome?: 'positive' | 'neutral' | 'negative' | 'no_answer';
  notes?: string;
  completedAt: Date;
}

export interface TaskCreatedPayload {
  activityId: string;
  title: string;
  description?: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  dueDate?: Date;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TaskCompletedPayload {
  activityId: string;
  taskId: string;
  completedAt: Date;
  completedBy?: string;
}

export interface InactivityDetectedPayload {
  entityType: 'contact' | 'deal' | 'company';
  entityId: string;
  lastActivityDate: Date;
  daysSinceLastActivity: number;
  activityCount: number;
  assignedTo?: string;
}

export interface NoteAddedPayload {
  activityId: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  note: string;
  addedBy?: string;
  addedAt: Date;
}

// Full event types
export type MeetingCompletedEvent = BaseEvent<MeetingCompletedPayload>;
export type MeetingScheduledEvent = BaseEvent<MeetingScheduledPayload>;
export type CallCompletedEvent = BaseEvent<CallCompletedPayload>;
export type TaskCreatedEvent = BaseEvent<TaskCreatedPayload>;
export type TaskCompletedEvent = BaseEvent<TaskCompletedPayload>;
export type InactivityDetectedEvent = BaseEvent<InactivityDetectedPayload>;
export type NoteAddedEvent = BaseEvent<NoteAddedPayload>;
