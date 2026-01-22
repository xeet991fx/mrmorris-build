import { Queue, Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { defaultQueueOptions, defaultWorkerOptions, QUEUE_NAMES } from '../events/queue/queue.config';

/**
 * Agent Scheduled Job - Story 3.3
 * Handles scheduled agent execution via BullMQ cron jobs
 * Pattern follows emailSyncJob.ts
 */

// Create agent scheduled queue
export const agentScheduledQueue = new Queue(
  QUEUE_NAMES.AGENT_SCHEDULED,
  defaultQueueOptions
);

/**
 * Register a scheduled agent job with cron expression
 * @param agentId - Agent ID to schedule
 * @param workspaceId - Workspace ID for the agent
 * @param cronExpression - Cron pattern (e.g., '0 9 * * *' for daily 9 AM)
 */
export const registerAgentSchedule = async (
  agentId: string,
  workspaceId: string,
  cronExpression: string
): Promise<void> => {
  // First remove any existing schedule for this agent
  await removeAgentSchedule(agentId);

  // Add new repeatable job with cron pattern
  await agentScheduledQueue.add(
    `scheduled-${agentId}`,
    { agentId, workspaceId },
    {
      repeat: {
        pattern: cronExpression,
      },
      jobId: `scheduled-${agentId}`, // Prevents duplicate registrations
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    }
  );

  console.log(`✅ Registered schedule for agent ${agentId}: ${cronExpression}`);
};

/**
 * Remove a scheduled agent job
 * @param agentId - Agent ID to unschedule
 */
export const removeAgentSchedule = async (agentId: string): Promise<void> => {
  const repeatableJobs = await agentScheduledQueue.getRepeatableJobs();
  const jobToRemove = repeatableJobs.find(j => j.name === `scheduled-${agentId}`);

  if (jobToRemove) {
    await agentScheduledQueue.removeRepeatableByKey(jobToRemove.key);
    console.log(`🗑️ Removed schedule for agent ${agentId}`);
  }
};

/**
 * Update an agent's schedule (remove old, add new)
 * @param agentId - Agent ID
 * @param workspaceId - Workspace ID
 * @param newCronExpression - New cron pattern
 */
export const updateAgentSchedule = async (
  agentId: string,
  workspaceId: string,
  newCronExpression: string
): Promise<void> => {
  await registerAgentSchedule(agentId, workspaceId, newCronExpression);
};

/**
 * Register schedules for all Live agents with scheduled triggers
 * Called on server startup to restore schedules after restart
 */
export const registerAllLiveAgentSchedules = async (): Promise<void> => {
  try {
    const Agent = (await import('../models/Agent')).default;

    // Find all Live agents with scheduled triggers
    const liveAgents = await Agent.find({
      status: 'Live',
      'triggers.type': 'scheduled',
      'triggers.enabled': { $ne: false },
    }).select('_id workspace triggers');

    let registeredCount = 0;

    for (const agent of liveAgents) {
      const scheduledTrigger = agent.triggers?.find(
        (t: any) => t.type === 'scheduled' && t.enabled !== false
      );

      if (scheduledTrigger?.config?.cron) {
        await registerAgentSchedule(
          agent._id.toString(),
          agent.workspace.toString(),
          scheduledTrigger.config.cron
        );
        registeredCount++;
      }
    }

    console.log(`✅ Registered ${registeredCount} agent schedule(s) on startup`);
  } catch (error) {
    console.error('❌ Failed to register agent schedules on startup:', error);
  }
};

/**
 * Worker to process scheduled agent execution jobs
 */
const agentScheduledWorker = new Worker(
  QUEUE_NAMES.AGENT_SCHEDULED,
  async (job: Job) => {
    const { agentId, workspaceId } = job.data;

    console.log(`🔄 Processing scheduled execution for agent: ${agentId}`);

    try {
      // Import models dynamically to avoid circular dependencies
      const Agent = (await import('../models/Agent')).default;
      const AgentExecution = (await import('../models/AgentExecution')).default;

      // 1. Query agent to verify still Live
      const agent = await Agent.findById(agentId);

      if (!agent) {
        console.log(`⚠️ Agent ${agentId} not found, skipping execution`);
        return { success: false, reason: 'Agent not found' };
      }

      // AC5: Paused Agent Behavior - Skip if paused
      if (agent.status === 'Paused') {
        // Create skipped execution record
        await AgentExecution.create({
          workspace: new mongoose.Types.ObjectId(workspaceId),
          agent: new mongoose.Types.ObjectId(agentId),
          executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'skipped',
          triggerType: 'scheduled',
          startedAt: new Date(),
          completedAt: new Date(),
          error: { message: 'Skipped: Agent paused' },
        });

        console.log(`⏸️ Agent ${agentId} is paused, skipping scheduled execution`);
        return { success: false, reason: 'Agent paused' };
      }

      if (agent.status !== 'Live') {
        console.log(`⚠️ Agent ${agentId} is not Live (status: ${agent.status}), skipping`);
        return { success: false, reason: 'Agent not Live' };
      }

      // AC6: Circuit Breaker - Check daily execution count
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

        // Remove scheduled job
        await removeAgentSchedule(agentId);

        // Create skipped execution record
        await AgentExecution.create({
          workspace: new mongoose.Types.ObjectId(workspaceId),
          agent: new mongoose.Types.ObjectId(agentId),
          executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          status: 'skipped',
          triggerType: 'scheduled',
          startedAt: new Date(),
          completedAt: new Date(),
          error: { message: 'Skipped: execution limit reached' },
        });

        // Emit Socket.io notification (import socket module)
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

      // AC4: Overlapping Execution - Check for running execution
      const runningExecution = await AgentExecution.findOne({
        agent: new mongoose.Types.ObjectId(agentId),
        status: { $in: ['pending', 'running'] },
      });

      if (runningExecution) {
        // Queue with delay instead of skipping
        await agentScheduledQueue.add(
          `scheduled-${agentId}-delayed`,
          { agentId, workspaceId },
          { delay: 60000 } // 60 seconds
        );

        // Emit queued notification
        try {
          const { getAgentExecutionNamespace } = await import('../socket/agentExecutionSocket');
          const namespace = getAgentExecutionNamespace();
          if (namespace) {
            namespace
              .to(`workspace:${workspaceId}:agent:${agentId}`)
              .emit('execution:queued', {
                agentId,
                message: 'Scheduled execution queued (previous run still active)',
                delayMs: 60000,
              });
          }
        } catch (socketError) {
          console.error('Failed to emit queued notification:', socketError);
        }

        console.log(`⏳ Agent ${agentId} execution queued - previous run still active`);
        return { success: false, reason: 'Execution queued - previous run active' };
      }

      // 3. Execute agent via AgentExecutionService
      const { AgentExecutionService } = await import('../services/AgentExecutionService');
      const result = await AgentExecutionService.executeAgent(
        agentId,
        workspaceId,
        { type: 'scheduled' }
      );

      // AC7: Track success - reset consecutive failures
      await Agent.findByIdAndUpdate(agentId, {
        consecutiveFailures: 0,
        lastScheduledExecution: new Date(),
      });

      console.log(`✅ Scheduled execution completed for agent ${agentId}`);
      return { success: true, executionId: result.executionId };
    } catch (error: any) {
      console.error(`❌ Scheduled execution failed for agent ${agentId}:`, error);

      // AC7: Track failure - increment consecutive failures
      try {
        const Agent = (await import('../models/Agent')).default;
        const agent = await Agent.findByIdAndUpdate(
          agentId,
          {
            $inc: { consecutiveFailures: 1 },
            lastScheduledExecution: new Date(),
          },
          { new: true }
        );

        // If 3+ consecutive failures, send alert
        if (agent && (agent.consecutiveFailures || 0) >= 3) {
          try {
            const { getAgentExecutionNamespace } = await import('../socket/agentExecutionSocket');
            const namespace = getAgentExecutionNamespace();
            if (namespace) {
              namespace
                .to(`workspace:${workspaceId}:agent:${agentId}`)
                .emit('agent:failure-alert', {
                  agentId,
                  consecutiveFailures: agent.consecutiveFailures,
                  message: `Agent has failed ${agent.consecutiveFailures} consecutive times`,
                  lastError: error.message,
                });
            }
          } catch (socketError) {
            console.error('Failed to emit failure alert:', socketError);
          }

          console.log(`⚠️ Agent ${agentId} has ${agent.consecutiveFailures} consecutive failures`);
        }
      } catch (updateError) {
        console.error('Failed to update consecutive failures:', updateError);
      }

      throw error; // Re-throw to trigger job failure handling
    }
  },
  {
    ...defaultWorkerOptions,
    concurrency: 10, // Process up to 10 scheduled executions simultaneously
  }
);

/**
 * Worker event handlers
 */

// Job completed successfully
agentScheduledWorker.on('completed', (job, result) => {
  if (result?.success) {
    console.log(`✅ Scheduled job completed:`, {
      jobId: job.id,
      agentId: job.data.agentId,
      executionId: result.executionId,
    });
  } else {
    console.log(`⏭️ Scheduled job skipped:`, {
      jobId: job.id,
      agentId: job.data.agentId,
      reason: result?.reason,
    });
  }
});

// Job failed
agentScheduledWorker.on('failed', (job, error) => {
  console.error(`❌ Scheduled job failed:`, {
    jobId: job?.id,
    agentId: job?.data?.agentId,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
});

// Worker active
agentScheduledWorker.on('active', (job) => {
  console.log(`🔄 Scheduled job started: ${job.id} (agent: ${job.data.agentId})`);
});

// Worker error
agentScheduledWorker.on('error', (error) => {
  console.error('❌ Agent scheduled worker error:', error);
});

/**
 * Start the agent scheduled job worker
 * Called on server startup
 */
export const startAgentScheduledJob = async (): Promise<void> => {
  try {
    // Remove any stale repeatable jobs that might exist from previous runs
    // (optional cleanup, helps prevent duplicate job registrations)
    console.log('✅ Agent scheduled job worker started');
  } catch (error) {
    console.error('❌ Failed to start agent scheduled job:', error);
  }
};

export { agentScheduledWorker };
