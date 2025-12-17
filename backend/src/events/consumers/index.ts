import { queueManager } from '../queue/QueueManager';
import { QUEUE_NAMES } from '../queue/queue.config';
import { BaseEvent } from '../types/base.types';
import { WorkflowBridgeConsumer } from './WorkflowBridgeConsumer';
import { ActivityLogConsumer } from './ActivityLogConsumer';
import { BaseConsumer } from './BaseConsumer';

// Register all consumers
const consumers: BaseConsumer[] = [
  new WorkflowBridgeConsumer(),
  new ActivityLogConsumer(),
];

/**
 * Initialize all event consumers
 */
export const initializeConsumers = (): void => {
  console.log('🔄 Initializing event consumers...');

  // Register main event queue worker
  queueManager.registerWorker(
    QUEUE_NAMES.CRM_EVENTS,
    async (event: BaseEvent) => {
      // Route event to all relevant consumers
      const promises = consumers
        .filter((consumer) => consumer.shouldHandle(event))
        .map((consumer) =>
          consumer.process(event).catch((error) => {
            consumer.handleError(event, error);
            // Don't throw - let other consumers process
          })
        );

      await Promise.all(promises);
    }
  );

  console.log(`✅ Initialized ${consumers.length} event consumers`);
};

export { consumers };
export default initializeConsumers;
