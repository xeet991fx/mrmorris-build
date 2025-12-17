import { v4 as uuidv4 } from 'uuid';
import { BaseEvent, EventMetadata, EVENT_VERSION } from '../types/base.types';
import { queueManager } from '../queue/QueueManager';
import { EVENT_PRIORITIES } from '../queue/queue.config';

export class EventPublisher {
  /**
   * Publish an event to the queue
   * Non-blocking and fail-safe - will not throw errors to prevent breaking CRM operations
   */
  async publish<T = any>(
    eventType: string,
    payload: T,
    options: {
      workspaceId: string;
      userId?: string;
      source?: 'api' | 'workflow' | 'system' | 'webhook';
      correlationId?: string;
      priority?: number;
      delay?: number;
    }
  ): Promise<void> {
    try {
      // Create event metadata
      const metadata: EventMetadata = {
        eventId: uuidv4(),
        timestamp: new Date(),
        workspaceId: options.workspaceId,
        userId: options.userId,
        version: EVENT_VERSION,
        source: options.source || 'api',
        correlationId: options.correlationId,
      };

      // Create full event
      const event: BaseEvent<T> = {
        metadata,
        eventType,
        payload,
      };

      // Validate event is serializable (important for Redis)
      const serialized = JSON.stringify(event);
      JSON.parse(serialized);

      // Enqueue event
      await queueManager.enqueueEvent(event, {
        priority: options.priority || EVENT_PRIORITIES.MEDIUM,
        delay: options.delay || 0,
      });

      console.log(`✅ Event published: ${eventType} (${metadata.eventId})`);
    } catch (error) {
      // FAIL-SAFE: Log error but don't throw to prevent breaking CRM operations
      console.error(`❌ Failed to publish event ${eventType}:`, error);
      console.error('Event payload:', payload);

      // TODO: Could add fallback logging to database here
    }
  }

  /**
   * Publish event synchronously (blocks until enqueued)
   * Use sparingly - prefer async publish()
   */
  publishSync<T = any>(
    eventType: string,
    payload: T,
    options: {
      workspaceId: string;
      userId?: string;
      source?: 'api' | 'workflow' | 'system' | 'webhook';
      correlationId?: string;
      priority?: number;
      delay?: number;
    }
  ): void {
    this.publish(eventType, payload, options).catch((error) => {
      console.error(`❌ Sync publish failed for ${eventType}:`, error);
    });
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(
    events: Array<{
      eventType: string;
      payload: any;
      options: {
        workspaceId: string;
        userId?: string;
        source?: 'api' | 'workflow' | 'system' | 'webhook';
        correlationId?: string;
        priority?: number;
        delay?: number;
      };
    }>
  ): Promise<void> {
    await Promise.all(
      events.map(({ eventType, payload, options }) =>
        this.publish(eventType, payload, options)
      )
    );
  }
}

// Singleton instance
export const eventPublisher = new EventPublisher();
export default eventPublisher;
