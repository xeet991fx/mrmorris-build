import { BaseEvent } from './base.types';

// Event type constants
export const EMAIL_EVENTS = {
  SENT: 'email.sent',
  DELIVERED: 'email.delivered',
  OPENED: 'email.opened',
  CLICKED: 'email.clicked',
  REPLIED: 'email.replied',
  BOUNCED: 'email.bounced',
  MARKED_SPAM: 'email.marked_spam',
} as const;

export type EmailEventType = typeof EMAIL_EVENTS[keyof typeof EMAIL_EVENTS];

// Payload interfaces
export interface EmailRepliedPayload {
  emailId: string;
  threadId: string;
  contactId?: string;
  from: string;
  to: string[];
  subject: string;
  bodyPreview: string;
  repliedAt: Date;
  campaignId?: string;
  sequenceId?: string;
}

export interface EmailOpenedPayload {
  emailId: string;
  contactId?: string;
  openedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  openCount: number;
}

export interface EmailClickedPayload {
  emailId: string;
  contactId?: string;
  url: string;
  clickedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface EmailSentPayload {
  emailId: string;
  contactId?: string;
  to: string[];
  subject: string;
  sentAt: Date;
  campaignId?: string;
  sequenceId?: string;
}

export interface EmailBouncedPayload {
  emailId: string;
  contactId?: string;
  email: string;
  bounceType: 'hard' | 'soft';
  reason?: string;
  bouncedAt: Date;
}

// Full event types
export type EmailRepliedEvent = BaseEvent<EmailRepliedPayload>;
export type EmailOpenedEvent = BaseEvent<EmailOpenedPayload>;
export type EmailClickedEvent = BaseEvent<EmailClickedPayload>;
export type EmailSentEvent = BaseEvent<EmailSentPayload>;
export type EmailBouncedEvent = BaseEvent<EmailBouncedPayload>;
