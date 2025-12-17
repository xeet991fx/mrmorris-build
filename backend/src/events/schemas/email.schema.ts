import { z } from 'zod';
import { EventMetadataSchema } from './contact.schema';

// Email replied payload schema
export const EmailRepliedPayloadSchema = z.object({
  emailId: z.string(),
  threadId: z.string(),
  contactId: z.string().optional(),
  from: z.string().email(),
  to: z.array(z.string().email()),
  subject: z.string(),
  bodyPreview: z.string(),
  repliedAt: z.date(),
  campaignId: z.string().optional(),
  sequenceId: z.string().optional(),
});

export const EmailRepliedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('email.replied'),
  payload: EmailRepliedPayloadSchema,
});

// Email opened payload schema
export const EmailOpenedPayloadSchema = z.object({
  emailId: z.string(),
  contactId: z.string().optional(),
  openedAt: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  openCount: z.number(),
});

export const EmailOpenedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('email.opened'),
  payload: EmailOpenedPayloadSchema,
});

// Email clicked payload schema
export const EmailClickedPayloadSchema = z.object({
  emailId: z.string(),
  contactId: z.string().optional(),
  url: z.string().url(),
  clickedAt: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const EmailClickedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('email.clicked'),
  payload: EmailClickedPayloadSchema,
});

// Email sent payload schema
export const EmailSentPayloadSchema = z.object({
  emailId: z.string(),
  contactId: z.string().optional(),
  to: z.array(z.string().email()),
  subject: z.string(),
  sentAt: z.date(),
  campaignId: z.string().optional(),
  sequenceId: z.string().optional(),
});

export const EmailSentEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('email.sent'),
  payload: EmailSentPayloadSchema,
});

// Email bounced payload schema
export const EmailBouncedPayloadSchema = z.object({
  emailId: z.string(),
  contactId: z.string().optional(),
  email: z.string().email(),
  bounceType: z.enum(['hard', 'soft']),
  reason: z.string().optional(),
  bouncedAt: z.date(),
});

export const EmailBouncedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('email.bounced'),
  payload: EmailBouncedPayloadSchema,
});
