import { BaseEvent } from '../types/base.types';

/**
 * Abstract base class for event consumers
 */
export abstract class BaseConsumer {
  /**
   * Name of this consumer (for logging)
   */
  abstract get name(): string;

  /**
   * Event types this consumer handles
   * Return empty array to handle all events
   */
  abstract get eventTypes(): string[];

  /**
   * Process an event
   */
  abstract process(event: BaseEvent): Promise<void>;

  /**
   * Should this consumer handle this event?
   */
  shouldHandle(event: BaseEvent): boolean {
    if (this.eventTypes.length === 0) {
      return true; // Handle all events
    }

    return this.eventTypes.includes(event.eventType);
  }

  /**
   * Error handler (can be overridden)
   */
  async handleError(event: BaseEvent, error: Error): Promise<void> {
    console.error(
      `❌ ${this.name} failed to process event ${event.eventType}:`,
      error
    );
  }
}
