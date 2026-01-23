import { QueueOptions, WorkerOptions } from 'bullmq';

// Queue names (BullMQ doesn't allow colons in queue names)
export const QUEUE_NAMES = {
  CRM_EVENTS: 'crm-events',
  CRM_EVENTS_DLQ: 'crm-events-dlq', // Dead letter queue
  WORKFLOW_BRIDGE: 'crm-workflow-bridge',
  ACTIVITY_LOG: 'crm-activity-log',
  CAMPAIGN_EMAILS: 'campaign-emails', // Queue for campaign email sending
  CAMPAIGN_EMAILS_DLQ: 'campaign-emails-dlq',
  AGENT_EXECUTION_RESUME: 'agent-execution-resume', // Story 3.5: For wait action resume scheduling
  AGENT_SCHEDULED: 'agent-scheduled', // Story 3.3: For scheduled agent execution
  AGENT_EVENT_TRIGGER: 'agent-event-trigger', // Story 3.4: For event-based agent execution
  NOTIFICATIONS: 'notifications',
} as const;

// Get Redis connection config (supports both REDIS_URL and individual params)
const getRedisConnection = () => {
  if (process.env.REDIS_URL) {
    // Parse REDIS_URL for Upstash/Railway/Heroku
    const url = new URL(process.env.REDIS_URL);
    const isTLS = url.protocol === 'rediss:';

    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      db: parseInt(url.pathname.slice(1) || '0'),
      // Enable TLS for Upstash (rediss:// protocol)
      ...(isTLS && { tls: {} }),
      maxRetriesPerRequest: null, // Required for BullMQ
    };
  }

  // Local development
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null, // Required for BullMQ
  };
};

// Default queue options
export const defaultQueueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
};

// Worker options - Optimized for Upstash to reduce Redis requests
export const defaultWorkerOptions: WorkerOptions = {
  connection: defaultQueueOptions.connection,
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3'),
  limiter: {
    max: parseInt(process.env.QUEUE_MAX_JOBS_PER_SECOND || '5'),
    duration: 1000, // per second
  },
  autorun: true,
  // IMPORTANT: Increase polling interval to reduce Upstash requests
  drainDelay: 30000, // 30 seconds between polls when queue is empty (default is 5s)
  stalledInterval: 60000, // Check for stalled jobs every 60s (default is 30s)
  lockDuration: 60000, // 60 second lock duration
};

// Event priority levels
export const EVENT_PRIORITIES = {
  CRITICAL: 1, // System-critical events
  HIGH: 2, // User-triggered events
  MEDIUM: 3, // Automated events
  LOW: 4, // Analytics/logging events
} as const;

// Retry delays
export const RETRY_DELAYS = {
  FIRST_RETRY: 1000, // 1 second
  SECOND_RETRY: 5000, // 5 seconds
  THIRD_RETRY: 30000, // 30 seconds
} as const;
