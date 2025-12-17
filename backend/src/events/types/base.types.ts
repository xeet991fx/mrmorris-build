// Event versioning for future compatibility
export const EVENT_VERSION = '1.0.0';

// Base metadata for all events
export interface EventMetadata {
  eventId: string; // UUID v4
  timestamp: Date; // ISO 8601 timestamp
  workspaceId: string; // MongoDB ObjectId as string
  userId?: string; // Who triggered the event (optional for system events)
  version: string; // Event schema version (e.g., "1.0.0")
  source: 'api' | 'workflow' | 'system' | 'webhook';
  correlationId?: string; // For tracing related events
}

// Base event interface
export interface BaseEvent<T = any> {
  metadata: EventMetadata;
  eventType: string; // e.g., "contact.created", "deal.stage_changed"
  payload: T;
}

// Event status for tracking
export type EventStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying';
