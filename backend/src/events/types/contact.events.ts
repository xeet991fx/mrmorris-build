import { BaseEvent } from './base.types';

// Event type constants
export const CONTACT_EVENTS = {
  CREATED: 'contact.created',
  UPDATED: 'contact.updated',
  DELETED: 'contact.deleted',
  STATUS_CHANGED: 'contact.status_changed',
  ASSIGNED: 'contact.assigned',
  TAG_ADDED: 'contact.tag_added',
  TAG_REMOVED: 'contact.tag_removed',
  ENRICHED: 'contact.enriched',
  JOB_CHANGED: 'contact.job_changed', // Data stewardship trigger
  MERGED: 'contact.merged',
} as const;

// Type union for type safety
export type ContactEventType =
  typeof CONTACT_EVENTS[keyof typeof CONTACT_EVENTS];

// Payload interfaces
export interface ContactCreatedPayload {
  contactId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
  source?: string;
  tags?: string[];
  assignedTo?: string;
  customFields?: Record<string, any>;
}

export interface ContactUpdatedPayload {
  contactId: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  updatedFields: string[];
}

export interface ContactStatusChangedPayload {
  contactId: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}

export interface ContactJobChangedPayload {
  contactId: string;
  oldCompany?: string;
  newCompany?: string;
  oldJobTitle?: string;
  newJobTitle?: string;
  linkedContactId?: string; // New contact created at new company
}

export interface ContactAssignedPayload {
  contactId: string;
  oldAssignedTo?: string;
  newAssignedTo: string;
}

export interface ContactTagPayload {
  contactId: string;
  tag: string;
}

// Full event types
export type ContactCreatedEvent = BaseEvent<ContactCreatedPayload>;
export type ContactUpdatedEvent = BaseEvent<ContactUpdatedPayload>;
export type ContactStatusChangedEvent = BaseEvent<ContactStatusChangedPayload>;
export type ContactJobChangedEvent = BaseEvent<ContactJobChangedPayload>;
export type ContactAssignedEvent = BaseEvent<ContactAssignedPayload>;
export type ContactTagEvent = BaseEvent<ContactTagPayload>;
