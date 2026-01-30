import { Queue, Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { defaultQueueOptions, defaultWorkerOptions, QUEUE_NAMES } from '../events/queue/queue.config';

/**
 * Agent Event Trigger Job - Story 3.4
 * Handles event-based agent execution via BullMQ
 * Pattern follows agentScheduledJob.ts
 */

// Event types supported by the agent system
export type AgentEventType = 'contact_created' | 'deal_stage_updated' | 'form_submitted';

// Job payload interface
export interface AgentEventTriggerJobData {
  agentId: string;
  workspaceId: string;
  eventType: AgentEventType;
  eventContext: {
    contact?: any;
    deal?: any;
    form?: any;
    previousStage?: string;
    newStage?: string;
    isNewContact?: boolean;
  };
  timestamp: Date;
  triggeredBy?: string;
}

// Create agent event trigger queue
export const agentEventTriggerQueue = new Queue<AgentEventTriggerJobData>(
  QUEUE_NAMES.AGENT_EVENT_TRIGGER,
  defaultQueueOptions
);

/**
 * Queue an event-triggered agent execution
 * @param agentId - Agent ID to execute
 * @param workspaceId - Workspace ID for the agent
 * @param eventType - Type of event that triggered this execution
 * @param eventContext - Context data from the event (contact, deal, form)
 * @param triggeredBy - User ID that caused the event (optional)
 */
export const queueEventTriggeredExecution = async (
  agentId: string,
  workspaceId: string,
  eventType: AgentEventType,
  eventContext: AgentEventTriggerJobData['eventContext'],
  triggeredBy?: string
): Promise<void> => {
  // Extract eventId from context for job uniqueness and traceability
  const eventId = eventContext.contact?._id?.toString()
    || eventContext.deal?._id?.toString()
    || eventContext.form?.formId
    || 'unknown';
  const jobName = `event-${agentId}-${eventId}-${Date.now()}`;

  await agentEventTriggerQueue.add(
    jobName,
    {
      agentId,
      workspaceId,
      eventType,
      eventContext,
      timestamp: new Date(),
      triggeredBy,
    },
    {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    }
  );

  console.log(`📩 Queued event-triggered execution for agent ${agentId} (${eventType})`);
};

/**
 * Get Redis connection for rate limiting
 * Uses the same connection as BullMQ queue
 */
const getRedisClient = async () => {
  const Redis = (await import('ioredis')).default;
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const client = new Redis(redisUrl);
    return client;
  }

  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  });
  return client;
};

// Lazy-loaded Redis client for rate limiting
let redisClient: any = null;

/**
 * Worker to process event-triggered agent execution jobs
 */
const agentEventTriggerWorker = new Worker<AgentEventTriggerJobData>(
  QUEUE_NAMES.AGENT_EVENT_TRIGGER,
  async (job: Job<AgentEventTriggerJobData>) => {
    const { agentId, workspaceId, eventType, eventContext } = job.data;

    console.log(`🔄 Processing event-triggered execution for agent: ${agentId} (${eventType})`);

    try {
      // Import models dynamically to avoid circular dependencies
      const Agent = (await import('../models/Agent')).default;
      const AgentExecution = (await import('../models/AgentExecution')).default;

      // 1. Query agent to verify status
      const agent = await Agent.findById(agentId);

      if (!agent) {
        console.log(`⚠️ Agent ${agentId} not found, skipping execution`);
        return { success: false, reason: 'Agent not found' };
      }

      // AC6: Paused Agent Behavior - Skip if paused
      if (agent.status === 'Paused') {
        // Create skipped execution record
        await AgentExecution.create({
          workspace: new mongoose.Types.ObjectId(workspaceId),
          agent: new mongoose.Types.ObjectId(agentId),
          executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'skipped',
          triggerType: 'event',
          triggerDetails: { eventType },
          startedAt: new Date(),
          completedAt: new Date(),
          error: { message: 'Skipped: Agent paused' },
        });

        console.log(`⏸️ Agent ${agentId} is paused, skipping event execution (${eventType})`);
        return { success: false, reason: 'Agent paused' };
      }

      if (agent.status !== 'Live') {
        console.log(`⚠️ Agent ${agentId} is not Live (status: ${agent.status}), skipping`);
        await AgentExecution.create({
          workspace: new mongoose.Types.ObjectId(workspaceId),
          agent: new mongoose.Types.ObjectId(agentId),
          executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'skipped',
          triggerType: 'event',
          triggerDetails: { eventType },
          startedAt: new Date(),
          completedAt: new Date(),
          error: { message: `Agent not Live (status: ${agent.status})` },
        });
        return { success: false, reason: 'Agent not Live' };
      }

      // AC7: Rate Limiting - Check per-minute execution count (10/min per agent)
      try {
        if (!redisClient) {
          redisClient = await getRedisClient();
        }

        const rateLimitKey = `event-trigger:${agentId}:minute`;
        const currentCount = await redisClient.incr(rateLimitKey);

        if (currentCount === 1) {
          // First request this minute - set TTL
          await redisClient.expire(rateLimitKey, 60);
        }

        if (currentCount > 10) {
          // Rate limit exceeded - requeue with delay
          await agentEventTriggerQueue.add(
            `${job.name}-retry`,
            job.data,
            { delay: 60000 } // Wait 60 seconds
          );

          // Emit Socket.io notification
          try {
            const { getAgentExecutionNamespace } = await import('../socket/agentExecutionSocket');
            const namespace = getAgentExecutionNamespace();
            if (namespace) {
              namespace
                .to(`workspace:${workspaceId}:agent:${agentId}`)
                .emit('execution:rate-limited', {
                  agentId,
                  reason: 'Rate limit exceeded (10/min)',
                  retryIn: 60,
                });
            }
          } catch (socketError) {
            console.error('Failed to emit rate-limit notification:', socketError);
          }

          console.log(`⏳ Agent ${agentId} rate limited (${currentCount}/10 per min), requeued`);
          return { success: false, reason: 'Rate limited, requeued' };
        }
      } catch (redisError) {
        // If Redis fails for rate limiting, continue execution (fail-open)
        console.error('Rate limit check failed (continuing):', redisError);
      }

      // AC7: Circuit Breaker - Check daily execution count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyExecutions = await AgentExecution.countDocuments({
        agent: new mongoose.Types.ObjectId(agentId),
        startedAt: { $gte: today },
        status: { $in: ['completed', 'failed', 'running', 'pending'] },
      });

      const maxPerDay = agent.restrictions?.maxExecutionsPerDay || 100;

      if (dailyExecutions >= maxPerDay) {
        // Auto-pause agent
        await Agent.findByIdAndUpdate(agentId, { status: 'Paused' });

        // Create skipped execution record
        await AgentExecution.create({
          workspace: new mongoose.Types.ObjectId(workspaceId),
          agent: new mongoose.Types.ObjectId(agentId),
          executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'skipped',
          triggerType: 'event',
          triggerDetails: { eventType },
          startedAt: new Date(),
          completedAt: new Date(),
          error: { message: 'Skipped: execution limit reached' },
        });

        // Emit Socket.io notification
        try {
          const { getAgentExecutionNamespace } = await import('../socket/agentExecutionSocket');
          const namespace = getAgentExecutionNamespace();
          if (namespace) {
            namespace
              .to(`workspace:${workspaceId}:agent:${agentId}`)
              .emit('agent:auto-paused', {
                agentId,
                reason: 'Daily execution limit reached',
                limit: maxPerDay,
              });
          }
        } catch (socketError) {
          console.error('Failed to emit auto-pause notification:', socketError);
        }

        console.log(`🛑 Agent ${agentId} hit circuit breaker (${dailyExecutions}/${maxPerDay}), auto-paused`);
        return { success: false, reason: 'Execution limit reached' };
      }

      // 4. Execute agent via AgentExecutionService with event context
      const { AgentExecutionService } = await import('../services/AgentExecutionService');
      const result = await AgentExecutionService.executeAgent(
        agentId,
        workspaceId,
        {
          type: 'event',
          eventDetails: {
            eventType,
            ...eventContext,
          },
        }
      );

      // Emit event triggered notification
      try {
        const { getAgentExecutionNamespace } = await import('../socket/agentExecutionSocket');
        const namespace = getAgentExecutionNamespace();
        if (namespace) {
          namespace
            .to(`workspace:${workspaceId}:agent:${agentId}`)
            .emit('agent:event-triggered', {
              agentId,
              eventType,
              eventContext: {
                contactId: eventContext.contact?._id?.toString(),
                dealId: eventContext.deal?._id?.toString(),
              },
              timestamp: new Date(),
            });
        }
      } catch (socketError) {
        console.error('Failed to emit event-triggered notification:', socketError);
      }

      console.log(`✅ Event-triggered execution completed for agent ${agentId} (${eventType})`);
      return { success: true, executionId: result.executionId };
    } catch (error: any) {
      console.error(`❌ Event-triggered execution failed for agent ${agentId}:`, error);
      throw error; // Re-throw to trigger job failure handling
    }
  },
  {
    ...defaultWorkerOptions,
    concurrency: 10, // Process up to 10 event-triggered executions simultaneously
  }
);

/**
 * Worker event handlers
 */

// Job completed successfully
agentEventTriggerWorker.on('completed', (job, result) => {
  if (result?.success) {
    console.log(`✅ Event trigger job completed:`, {
      jobId: job.id,
      agentId: job.data.agentId,
      eventType: job.data.eventType,
      executionId: result.executionId,
    });
  } else {
    console.log(`⏭️ Event trigger job skipped:`, {
      jobId: job.id,
      agentId: job.data.agentId,
      eventType: job.data.eventType,
      reason: result?.reason,
    });
  }
});

// Job failed
agentEventTriggerWorker.on('failed', (job, error) => {
  console.error(`❌ Event trigger job failed:`, {
    jobId: job?.id,
    agentId: job?.data?.agentId,
    eventType: job?.data?.eventType,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
});

// Worker active
agentEventTriggerWorker.on('active', (job) => {
  console.log(`🔄 Event trigger job started: ${job.id} (agent: ${job.data.agentId}, event: ${job.data.eventType})`);
});

// Worker error
agentEventTriggerWorker.on('error', (error) => {
  console.error('❌ Agent event trigger worker error:', error);
});

/**
 * Start the agent event trigger job worker
 * Called on server startup
 */
export const startAgentEventTriggerJob = async (): Promise<void> => {
  try {
    console.log('✅ Agent event trigger job worker started');
  } catch (error) {
    console.error('❌ Failed to start agent event trigger job:', error);
  }
};

/**
 * Cleanup Redis client on process exit
 */
process.on('beforeExit', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});

export { agentEventTriggerWorker };
