import { z } from 'zod';

// Base metadata schema
export const EventMetadataSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.date(),
  workspaceId: z.string(),
  userId: z.string().optional(),
  version: z.string().default('1.0.0'),
  source: z.enum(['api', 'workflow', 'system', 'webhook']),
  correlationId: z.string().optional(),
});

// Contact created payload schema
export const ContactCreatedPayloadSchema = z.object({
  contactId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.enum(['lead', 'prospect', 'customer', 'inactive']),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

// Full event schema
export const ContactCreatedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('contact.created'),
  payload: ContactCreatedPayloadSchema,
});

// Contact updated schema
export const ContactUpdatedPayloadSchema = z.object({
  contactId: z.string(),
  changes: z.array(
    z.object({
      field: z.string(),
      oldValue: z.any(),
      newValue: z.any(),
    })
  ),
  updatedFields: z.array(z.string()),
});

export const ContactUpdatedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('contact.updated'),
  payload: ContactUpdatedPayloadSchema,
});

// Contact status changed schema
export const ContactStatusChangedPayloadSchema = z.object({
  contactId: z.string(),
  oldStatus: z.string(),
  newStatus: z.string(),
  reason: z.string().optional(),
});

export const ContactStatusChangedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('contact.status_changed'),
  payload: ContactStatusChangedPayloadSchema,
});

// Job changed schema (Data Stewardship)
export const ContactJobChangedPayloadSchema = z.object({
  contactId: z.string(),
  oldCompany: z.string().optional(),
  newCompany: z.string().optional(),
  oldJobTitle: z.string().optional(),
  newJobTitle: z.string().optional(),
  linkedContactId: z.string().optional(),
});

export const ContactJobChangedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('contact.job_changed'),
  payload: ContactJobChangedPayloadSchema,
});

// Contact assigned schema
export const ContactAssignedPayloadSchema = z.object({
  contactId: z.string(),
  oldAssignedTo: z.string().optional(),
  newAssignedTo: z.string(),
});

export const ContactAssignedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('contact.assigned'),
  payload: ContactAssignedPayloadSchema,
});
