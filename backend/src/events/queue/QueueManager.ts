import { Queue, Worker, Job, QueueEvents, WorkerOptions } from 'bullmq';
import { BaseEvent } from '../types/base.types';
import {
  QUEUE_NAMES,
  defaultQueueOptions,
  defaultWorkerOptions,
  EVENT_PRIORITIES,
} from './queue.config';

export type EventHandler = (event: BaseEvent) => Promise<void>;

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  /**
   * Get or create a queue
   */
  getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, defaultQueueOptions);
      this.queues.set(queueName, queue);

      // NOTE: QueueEvents monitoring disabled to reduce Upstash Redis requests
      // Worker event listeners provide sufficient logging for job completion/failure
      // Uncomment below if you have unlimited Redis requests or use local Redis
      /*
      const queueEvents = new QueueEvents(queueName, {
        connection: defaultQueueOptions.connection,
      });

      queueEvents.on('completed', ({ jobId }) => {
        console.log(`✅ Job ${jobId} completed in queue ${queueName}`);
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(
          `❌ Job ${jobId} failed in queue ${queueName}:`,
          failedReason
        );
      });

      this.queueEvents.set(queueName, queueEvents);
      */
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Add event to queue
   */
  async enqueueEvent(
    event: BaseEvent,
    options: {
      priority?: number;
      delay?: number;
      queueName?: string;
    } = {}
  ): Promise<void> {
    const {
      priority = EVENT_PRIORITIES.MEDIUM,
      delay = 0,
      queueName = QUEUE_NAMES.CRM_EVENTS,
    } = options;

    const queue = this.getQueue(queueName);

    try {
      await queue.add(event.eventType, event, {
        priority,
        delay,
        jobId: event.metadata.eventId, // Use eventId as jobId for idempotency
      });

      console.log(
        `📤 Event enqueued: ${event.eventType} (${event.metadata.eventId})`
      );
    } catch (error) {
      console.error(`Failed to enqueue event ${event.eventType}:`, error);
      throw error;
    }
  }

  /**
   * Register a worker to process events
   */
  registerWorker(
    queueName: string,
    handler: EventHandler,
    options: Partial<WorkerOptions> = {}
  ): Worker {
    if (this.workers.has(queueName)) {
      console.warn(`⚠️ Worker already registered for queue ${queueName}`);
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(
      queueName,
      async (job: Job<BaseEvent>) => {
        console.log(
          `🔄 Processing event: ${job.data.eventType} (${job.id})`
        );

        try {
          await handler(job.data);
          console.log(
            `✅ Event processed: ${job.data.eventType} (${job.id})`
          );
        } catch (error) {
          console.error(
            `❌ Event processing failed: ${job.data.eventType} (${job.id})`,
            error
          );
          throw error; // Let BullMQ handle retries
        }
      },
      {
        ...defaultWorkerOptions,
        ...options,
      }
    );

    // Worker event listeners
    worker.on('completed', (job) => {
      console.log(`✅ Worker completed job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Worker failed job ${job?.id}:`, err.message);

      // Move to DLQ after all retries exhausted
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        this.moveToDLQ(job.data).catch(console.error);
      }
    });

    worker.on('error', async (err) => {
      console.error(`❌ Worker error in queue ${queueName}:`, err);

      // Detect Upstash rate limit error and pause worker
      const errMessage = err.message || '';
      if (errMessage.includes('max requests limit exceeded') ||
        errMessage.includes('ERR max requests')) {
        console.warn(`⚠️ Upstash rate limit hit. Pausing worker for 5 minutes...`);

        try {
          // Pause the worker
          await worker.pause();

          // Resume after 5 minutes
          setTimeout(async () => {
            try {
              await worker.resume();
              console.log(`▶️ Worker resumed after rate limit cooldown: ${queueName}`);
            } catch (resumeErr) {
              console.error(`Failed to resume worker ${queueName}:`, resumeErr);
            }
          }, 5 * 60 * 1000); // 5 minutes
        } catch (pauseErr) {
          console.error(`Failed to pause worker ${queueName}:`, pauseErr);
        }
      }
    });

    this.workers.set(queueName, worker);
    console.log(`🚀 Worker registered for queue: ${queueName}`);

    return worker;
  }

  /**
   * Move failed event to Dead Letter Queue
   */
  private async moveToDLQ(event: BaseEvent): Promise<void> {
    const dlqQueue = this.getQueue(QUEUE_NAMES.CRM_EVENTS_DLQ);

    await dlqQueue.add(
      `dlq:${event.eventType}`,
      {
        ...event,
        movedToDLQAt: new Date().toISOString(),
      },
      {
        priority: EVENT_PRIORITIES.LOW,
      }
    );

    console.log(
      `📮 Event moved to DLQ: ${event.eventType} (${event.metadata.eventId})`
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    console.log(`⏸️ Queue paused: ${queueName}`);
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    console.log(`▶️ Queue resumed: ${queueName}`);
  }

  /**
   * Graceful shutdown of all queues and workers
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down queue manager...');

    // Close all workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      console.log(`✅ Worker closed: ${name}`);
    }

    // Close all queue events
    for (const [name, queueEvents] of this.queueEvents.entries()) {
      await queueEvents.close();
      console.log(`✅ Queue events closed: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      console.log(`✅ Queue closed: ${name}`);
    }

    console.log('✅ Queue manager shutdown complete');
  }
}

// Singleton instance
export const queueManager = new QueueManager();
export default queueManager;
