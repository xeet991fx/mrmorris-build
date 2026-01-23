import { Queue, Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { defaultQueueOptions, defaultWorkerOptions, QUEUE_NAMES } from '../events/queue/queue.config';

/**
 * Agent Resume Execution Job - Story 3.5
 * Handles resuming agent execution after wait action completes
 * Pattern follows agentScheduledJob.ts
 */

// Create agent resume execution queue
export const agentResumeExecutionQueue = new Queue(
  QUEUE_NAMES.AGENT_EXECUTION_RESUME,
  defaultQueueOptions
);

/**
 * Worker to process resume execution jobs
 * Triggered when wait action duration expires
 */
const agentResumeExecutionWorker = new Worker(
  QUEUE_NAMES.AGENT_EXECUTION_RESUME,
  async (job: Job) => {
    const { executionId, agentId, workspaceId, resumeFromStep } = job.data;

    console.log(`🔄 Resuming execution ${executionId} from step ${resumeFromStep}`);

    try {
      // Import models dynamically to avoid circular dependencies
      const Agent = (await import('../models/Agent')).default;
      const AgentExecution = (await import('../models/AgentExecution')).default;
      const InstructionParserService = (await import('../services/InstructionParserService')).default;
      const { AgentExecutionService } = await import('../services/AgentExecutionService');

      // 1. Load execution record
      const execution = await AgentExecution.findById(executionId);
      if (!execution) {
        console.log(`⚠️ Execution ${executionId} not found, skipping resume`);
        return { success: false, reason: 'Execution not found' };
      }

      // Verify execution is in waiting state
      if (execution.status !== 'waiting') {
        console.log(`⚠️ Execution ${executionId} not in waiting state (status: ${execution.status}), skipping`);
        return { success: false, reason: 'Execution not in waiting state' };
      }

      // 2. Check agent still exists and is Live
      const agent = await Agent.findById(agentId);
      if (!agent) {
        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'failed',
          completedAt: new Date(),
        });

        // Emit Socket.io notification
        try {
          const { emitExecutionFailed } = await import('../socket/agentExecutionSocket');
          emitExecutionFailed(workspaceId, agentId, {
            executionId: execution.executionId,
            success: false,
            error: 'Agent deleted during wait period',
            completedAt: new Date(),
          });
        } catch (socketError) {
          console.error('Failed to emit execution failed:', socketError);
        }

        console.log(`⚠️ Agent ${agentId} not found (deleted during wait), execution ${executionId} marked failed`);
        return { success: false, reason: 'Agent deleted' };
      }

      // Check if agent is paused
      if (agent.status === 'Paused') {
        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'failed',
          completedAt: new Date(),
        });

        // Emit Socket.io notification
        try {
          const { emitExecutionFailed } = await import('../socket/agentExecutionSocket');
          emitExecutionFailed(workspaceId, agentId, {
            executionId: execution.executionId,
            success: false,
            error: 'Agent paused during wait period',
            completedAt: new Date(),
          });
        } catch (socketError) {
          console.error('Failed to emit execution failed:', socketError);
        }

        console.log(`⏸️ Agent ${agentId} is paused, execution ${executionId} marked failed`);
        return { success: false, reason: 'Agent paused' };
      }

      if (agent.status !== 'Live') {
        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'failed',
          completedAt: new Date(),
        });

        console.log(`⚠️ Agent ${agentId} is not Live (status: ${agent.status}), execution ${executionId} marked failed`);
        return { success: false, reason: 'Agent not Live' };
      }

      // 3. Restore execution context
      if (!execution.savedContext) {
        console.log(`⚠️ No saved context for execution ${executionId}, cannot resume`);
        return { success: false, reason: 'No saved context' };
      }

      const restoredContext = AgentExecutionService.restoreExecutionContext(
        execution.savedContext,
        execution.savedMemory || {}
      );

      // 4. Update execution status to running
      await AgentExecution.findByIdAndUpdate(executionId, {
        status: 'running',
        savedContext: null,
        savedMemory: null,
        resumeAt: null,
        resumeJobId: null,
      });

      // Emit execution resumed notification
      try {
        const { emitExecutionProgress } = await import('../socket/agentExecutionSocket');
        emitExecutionProgress(workspaceId, agentId, {
          executionId: execution.executionId,
          step: resumeFromStep,
          total: execution.totalSteps,
          action: 'resume',
          status: 'resumed',
          message: `Execution resumed from step ${resumeFromStep}`,
        });
      } catch (socketError) {
        console.error('Failed to emit resume notification:', socketError);
      }

      // 5. Parse agent instructions
      let parsedSteps = agent.parsedActions || [];
      if (!parsedSteps.length && agent.instructions) {
        const parseResult = await InstructionParserService.parseInstructions(
          agent.instructions,
          workspaceId
        );
        if (parseResult.success) {
          parsedSteps = parseResult.actions;
        }
      }

      if (!parsedSteps.length) {
        console.log(`⚠️ No parsed steps for agent ${agentId}`);
        return { success: false, reason: 'No parsed steps' };
      }

      // 6. Continue execution from resumeFromStep
      const resumeStartTime = Date.now();
      const result = await AgentExecutionService.executeStepsSequentially(
        execution,
        parsedSteps,
        restoredContext,
        resumeFromStep
      );
      const resumeDuration = Date.now() - resumeStartTime;

      // 7. Update execution based on result
      if (result.status === 'completed') {
        const completedAt = new Date();

        // Calculate total duration (original execution + wait time + resume execution)
        const originalDuration = execution.summary?.totalDurationMs || 0;
        const totalDuration = originalDuration + resumeDuration;

        // Calculate steps completed in this resume session
        const stepsCompletedInResume = result.completedSteps - (resumeFromStep - 1);

        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'completed',
          completedAt,
          'summary.totalDurationMs': totalDuration,
        });

        // Emit completion notification
        try {
          const { emitExecutionCompleted } = await import('../socket/agentExecutionSocket');
          emitExecutionCompleted(workspaceId, agentId, {
            executionId: execution.executionId,
            success: true,
            processedCount: stepsCompletedInResume,
            summary: {
              totalSteps: parsedSteps.length,
              successfulSteps: result.completedSteps,
              failedSteps: 0,
              skippedSteps: parsedSteps.length - result.completedSteps,
              duration: resumeDuration,
            },
            completedAt,
          });
        } catch (socketError) {
          console.error('Failed to emit completion notification:', socketError);
        }

        console.log(`✅ Resumed execution ${executionId} completed successfully (${resumeDuration}ms)`);
      } else if (result.status === 'waiting') {
        // Another wait action encountered - already handled in executeStepsSequentially
        console.log(`⏳ Execution ${executionId} entered wait state again`);
      } else if (result.status === 'failed') {
        // Failed - already handled in executeStepsSequentially
        console.log(`❌ Resumed execution ${executionId} failed at step ${result.failedStep}`);
      }

      return { success: true, result };

    } catch (error: any) {
      console.error(`❌ Resume execution failed for ${executionId}:`, error);

      // Update execution as failed
      try {
        const AgentExecution = (await import('../models/AgentExecution')).default;
        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'failed',
          completedAt: new Date(),
        });
      } catch (updateError) {
        console.error('Failed to update execution status:', updateError);
      }

      throw error; // Re-throw to trigger job failure handling
    }
  },
  {
    ...defaultWorkerOptions,
    concurrency: 5, // Process up to 5 resume executions simultaneously
  }
);

/**
 * Worker event handlers
 */

agentResumeExecutionWorker.on('completed', (job, result) => {
  if (result?.success) {
    console.log(`✅ Resume job completed:`, {
      jobId: job.id,
      executionId: job.data.executionId,
    });
  } else {
    console.log(`⏭️ Resume job skipped:`, {
      jobId: job.id,
      executionId: job.data.executionId,
      reason: result?.reason,
    });
  }
});

agentResumeExecutionWorker.on('failed', (job, error) => {
  console.error(`❌ Resume job failed:`, {
    jobId: job?.id,
    executionId: job?.data?.executionId,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
});

agentResumeExecutionWorker.on('active', (job) => {
  console.log(`🔄 Resume job started: ${job.id} (execution: ${job.data.executionId})`);
});

agentResumeExecutionWorker.on('error', (error) => {
  console.error('❌ Agent resume execution worker error:', error);
});

/**
 * Start the agent resume execution job worker
 * Called on server startup
 */
export const startAgentResumeExecutionJob = async (): Promise<void> => {
  try {
    console.log('✅ Agent resume execution job worker started');
  } catch (error) {
    console.error('❌ Failed to start agent resume execution job:', error);
  }
};

export { agentResumeExecutionWorker };
