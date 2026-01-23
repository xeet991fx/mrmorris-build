# Story 3.5: Sequential Multi-Step Workflows

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to execute multiple steps in sequence,
So that I can build complex workflows that accomplish complete tasks.

## Acceptance Criteria

1. **AC1: Sequential Step Execution**
   - Given agent has instructions with 5 steps
   - When execution runs
   - Then steps execute in order: 1 → 2 → 3 → 4 → 5
   - And each step completes before the next begins
   - And context (variables, memory) flows between steps

2. **AC2: Step Dependencies and Data Flow**
   - Given step 2 depends on step 1 results
   - When step 1 finds 10 contacts
   - Then step 2 receives the contact list
   - And step 2 can iterate over each contact
   - And step 2 actions apply to all 10 contacts

3. **AC3: Error Handling and Partial Completion**
   - Given step 3 fails with error
   - When error occurs
   - Then steps 1 and 2 remain completed
   - And steps 4 and 5 are not executed
   - And execution status is "failed"
   - And error is logged with step number and details

4. **AC4: Memory Operations Between Steps**
   - Given agent uses memory between steps
   - When step 1 saves data to memory: @memory.processedContacts = [contact1, contact2]
   - Then step 3 can read from memory: "Skip contacts in @memory.processedContacts"
   - And memory persists for the duration of execution

5. **AC5: Long Workflow Progress Tracking**
   - Given agent has 20 steps
   - When execution runs
   - Then all steps execute sequentially
   - And total execution time is sum of all step durations
   - And long-running executions show progress: "Step 12 of 20 completed"

6. **AC6: Wait Action Resume Capability**
   - Given step 7 is a "Wait" action
   - When wait step executes
   - Then execution pauses (job is scheduled to resume after wait period)
   - And steps 8-20 execute after wait completes
   - And execution spans multiple job executions (resume capability)

## Tasks / Subtasks

- [ ] **Task 1: Enhance AgentExecutionService for Multi-Step State Management (AC: 1, 2, 3, 4)**
  - [ ] 1.1 Add `currentStep`, `totalSteps`, `stepResults` fields to AgentExecution model
  - [ ] 1.2 Create `ExecutionContext` interface: `{ variables: Map, memory: Map, stepResults: StepResult[] }`
  - [ ] 1.3 Implement `initializeExecutionContext(agent, triggerContext)` - creates initial context
  - [ ] 1.4 Implement `executeStep(stepIndex, step, context)` - executes single step, returns updated context
  - [ ] 1.5 Implement `executeStepsSequentially(steps, context)` - main loop orchestrating sequential execution
  - [ ] 1.6 Pass context between steps - each step receives results from all previous steps

- [ ] **Task 2: Implement Step Result Tracking (AC: 1, 3, 5)**
  - [ ] 2.1 Create `IStepResult` interface: `{ stepIndex: number, action: string, status: 'pending'|'running'|'completed'|'failed'|'skipped', startedAt: Date, completedAt?: Date, result?: any, error?: any }`
  - [ ] 2.2 Update AgentExecution model with `steps: [IStepResult]` field
  - [ ] 2.3 Before each step: Update step status to 'running' and save to database
  - [ ] 2.4 After step success: Update step status to 'completed', add result, save
  - [ ] 2.5 After step failure: Update step status to 'failed', add error, mark remaining steps as 'skipped', save

- [ ] **Task 3: Implement Context Data Flow (AC: 2, 4)**
  - [ ] 3.1 Create `StepOutputs` map in execution context: `{ 'step1': { contacts: [...] }, 'step2': { emails: [...] } }`
  - [ ] 3.2 After step completes: Store step output in StepOutputs with key `step{n}`
  - [ ] 3.3 Implement variable resolution for step outputs: `@step1.contacts`, `@step2.results`
  - [ ] 3.4 Implement memory read/write during step execution: `context.memory.set('key', value)`, `context.memory.get('key')`
  - [ ] 3.5 Variable resolution for memory: `@memory.processedContacts` → `context.memory.get('processedContacts')`

- [ ] **Task 4: Implement Error Handling and Partial Completion (AC: 3)**
  - [ ] 4.1 Wrap each step execution in try-catch
  - [ ] 4.2 On step failure: Log error with step number, action type, and error message
  - [ ] 4.3 Mark all subsequent steps as 'skipped' with reason: "Previous step failed"
  - [ ] 4.4 Update execution status to 'failed' with error details pointing to failed step
  - [ ] 4.5 Preserve completed step results - do not rollback successful steps
  - [ ] 4.6 Include step-level error in execution summary: `"Failed at step 3: Email template not found"`

- [ ] **Task 5: Implement Progress Tracking and Socket.io Updates (AC: 5)**
  - [ ] 5.1 After each step completes: Emit Socket.io event `execution:step-completed` with `{ executionId, stepIndex, totalSteps, status, result }`
  - [ ] 5.2 On step start: Emit `execution:step-started` with `{ executionId, stepIndex, totalSteps, action }`
  - [ ] 5.3 Create progress percentage: `Math.round((completedSteps / totalSteps) * 100)`
  - [ ] 5.4 Include in real-time update: "Step 12 of 20 completed (60%)"
  - [ ] 5.5 Update frontend to display progress indicator with step count

- [ ] **Task 6: Implement Wait Action and Resume Capability (AC: 6)**
  - [ ] 6.1 Detect "Wait" action type in step execution
  - [ ] 6.2 When wait action encountered: Save execution state (currentStep, context, memory) to AgentExecution
  - [ ] 6.3 Set execution status to 'waiting' with `resumeAt` timestamp
  - [ ] 6.4 Create BullMQ delayed job: `agent-resume-execution` with delay based on wait duration
  - [ ] 6.5 Job payload: `{ executionId, agentId, workspaceId, resumeFromStep }`
  - [ ] 6.6 Create resume worker: Load execution, restore context, continue from `resumeFromStep`

- [ ] **Task 7: Create Agent Resume Execution Job (AC: 6)**
  - [ ] 7.1 Create `backend/src/jobs/agentResumeExecutionJob.ts` following BullMQ patterns
  - [ ] 7.2 Add queue name in queue.config.ts: `AGENT_RESUME_EXECUTION: 'agent-resume-execution'`
  - [ ] 7.3 Worker handler: Load AgentExecution by executionId
  - [ ] 7.4 Deserialize saved context and memory from execution record
  - [ ] 7.5 Call `executeStepsSequentially()` starting from `resumeFromStep`
  - [ ] 7.6 Handle edge cases: agent deleted during wait, agent paused during wait

- [ ] **Task 8: Extend AgentExecution Model for Resume Capability (AC: 6)**
  - [ ] 8.1 Add field `savedContext: Object` to store serialized execution context
  - [ ] 8.2 Add field `savedMemory: Object` to store serialized memory map
  - [ ] 8.3 Add field `resumeFromStep: number` to track resume point
  - [ ] 8.4 Add field `resumeAt: Date` for scheduled resume time
  - [ ] 8.5 Add index: `{ status: 1, resumeAt: 1 }` for querying waiting executions

- [ ] **Task 9: Integrate with InstructionParserService (AC: 1, 2)**
  - [ ] 9.1 Ensure parsed instructions include step number/index
  - [ ] 9.2 Parsed step structure: `{ index: number, action: string, params: Object, dependsOn?: number[] }`
  - [ ] 9.3 Handle iteration actions: `{ action: 'for_each', over: '@step1.contacts', do: [actions] }`
  - [ ] 9.4 Pass step outputs to parser for variable resolution

- [ ] **Task 10: Add Tests (AC: All)**
  - [ ] 10.1 Unit test: Sequential execution of 5 steps
  - [ ] 10.2 Unit test: Context flows between steps (step 2 reads step 1 results)
  - [ ] 10.3 Unit test: Step 3 fails, steps 1-2 complete, steps 4-5 skipped
  - [ ] 10.4 Unit test: Memory read/write operations across steps
  - [ ] 10.5 Unit test: Progress events emitted at correct intervals
  - [ ] 10.6 Integration test: Wait action triggers resume job
  - [ ] 10.7 Integration test: Resume job continues from correct step

## Dev Notes

### Key Difference from Previous Stories

| Aspect | Story 3.4: Event Triggers | Story 3.5: Multi-Step Workflows |
|--------|---------------------------|----------------------------------|
| Focus | How execution starts | How execution proceeds internally |
| State | Single execution | State across multiple steps |
| Context | Event data (contact/deal) | Step outputs + memory |
| Failure | Execution fails | Partial completion preserved |
| Duration | Usually short | Can span wait periods (days) |

### Architecture Pattern: Step Execution Pipeline

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Parsed Steps   │────▶│ executeStepsSequentially │────▶│  Execution      │
│  [step1, step2, │     │                        │     │  Context        │
│   step3, ...]   │     │  for each step:        │     │  - variables    │
└─────────────────┘     │    execute(step)       │     │  - memory       │
                        │    update context      │     │  - stepResults  │
                        │    emit progress       │     └─────────────────┘
                        │    check for wait      │
                        └──────────────────────┘
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                 ┌─────────────┐       ┌─────────────┐
                 │   Success   │       │   Wait      │
                 │   Continue  │       │   Detected  │
                 │   to next   │       │   ─────▶ Save state
                 └─────────────┘       │   ─────▶ Schedule resume
                                       └─────────────┘
```

### Execution Context Structure

```typescript
interface IExecutionContext {
  // Initial trigger context
  triggerType: 'manual' | 'scheduled' | 'event';
  triggerData: ITriggerContext;

  // Variables available during execution
  variables: {
    contact?: IContact;       // From trigger or step output
    deal?: IOpportunity;      // From trigger or step output
    form?: IFormSubmission;   // From event trigger
    [key: string]: any;       // Dynamic variables
  };

  // Step outputs for dependency resolution
  stepOutputs: {
    [stepKey: string]: {      // 'step1', 'step2', etc.
      action: string;
      result: any;
      timestamp: Date;
    };
  };

  // Memory for cross-step data sharing
  memory: Map<string, any>;

  // Execution metadata
  currentStep: number;
  totalSteps: number;
}
```

### Step Result Interface

```typescript
interface IStepResult {
  stepIndex: number;           // 0-based index
  stepNumber: number;          // 1-based for display
  action: string;              // 'search_contacts', 'send_email', etc.
  actionParams: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;           // milliseconds
  result?: {
    success: boolean;
    data: any;                 // Action-specific output
    itemsProcessed?: number;   // For batch operations
  };
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  skippedReason?: string;      // "Previous step failed"
}
```

### Enhanced AgentExecution Model Schema

Add these fields to existing AgentExecution model:

```typescript
// backend/src/models/AgentExecution.ts - additions

const agentExecutionSchema = new Schema({
  // ... existing fields ...

  // Multi-step tracking
  currentStep: { type: Number, default: 0 },
  totalSteps: { type: Number, default: 1 },
  steps: [{
    stepIndex: { type: Number, required: true },
    stepNumber: { type: Number, required: true },
    action: { type: String, required: true },
    actionParams: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'waiting'],
      default: 'pending'
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number },
    result: { type: Schema.Types.Mixed },
    error: {
      message: { type: String },
      code: { type: String },
      details: { type: Schema.Types.Mixed }
    },
    skippedReason: { type: String }
  }],

  // Resume capability
  savedContext: { type: Schema.Types.Mixed },  // Serialized execution context
  savedMemory: { type: Schema.Types.Mixed },   // Serialized memory Map
  resumeFromStep: { type: Number },
  resumeAt: { type: Date },
  resumeJobId: { type: String },               // BullMQ job ID for cancellation
});

// Add index for waiting executions
agentExecutionSchema.index({ status: 1, resumeAt: 1 });
```

### Sequential Execution Implementation

```typescript
// backend/src/services/AgentExecutionService.ts - additions

async executeStepsSequentially(
  execution: IAgentExecution,
  steps: IParsedStep[],
  context: IExecutionContext,
  startFromStep: number = 0
): Promise<IExecutionResult> {

  for (let i = startFromStep; i < steps.length; i++) {
    const step = steps[i];
    context.currentStep = i;

    // Update execution tracking
    await this.updateStepStatus(execution._id, i, 'running');
    this.emitStepStarted(execution, i, steps.length, step.action);

    try {
      // Check for Wait action
      if (step.action === 'wait') {
        await this.handleWaitAction(execution, step, context, i + 1);
        return { status: 'waiting', completedSteps: i };
      }

      // Execute the step
      const stepResult = await this.executeStep(step, context);

      // Store step output for subsequent steps
      context.stepOutputs[`step${i + 1}`] = {
        action: step.action,
        result: stepResult,
        timestamp: new Date()
      };

      // Update step status
      await this.updateStepStatus(execution._id, i, 'completed', stepResult);
      this.emitStepCompleted(execution, i, steps.length, stepResult);

    } catch (error) {
      // Handle step failure
      await this.handleStepFailure(execution, i, steps.length, error);
      return { status: 'failed', failedStep: i, error };
    }
  }

  return { status: 'completed', completedSteps: steps.length };
}

private async handleWaitAction(
  execution: IAgentExecution,
  step: IParsedStep,
  context: IExecutionContext,
  resumeFromStep: number
): Promise<void> {
  const waitDuration = this.parseWaitDuration(step.params.duration); // in ms
  const resumeAt = new Date(Date.now() + waitDuration);

  // Serialize and save context
  await AgentExecution.findByIdAndUpdate(execution._id, {
    status: 'waiting',
    savedContext: JSON.parse(JSON.stringify(context)),
    savedMemory: Object.fromEntries(context.memory),
    resumeFromStep,
    resumeAt,
    'steps.$[elem].status': 'waiting'
  }, {
    arrayFilters: [{ 'elem.stepIndex': context.currentStep }]
  });

  // Schedule resume job
  const job = await agentResumeExecutionQueue.add(
    `resume-${execution._id}`,
    {
      executionId: execution._id.toString(),
      agentId: execution.agent.toString(),
      workspaceId: execution.workspace.toString(),
      resumeFromStep
    },
    { delay: waitDuration }
  );

  // Store job ID for cancellation if needed
  await AgentExecution.findByIdAndUpdate(execution._id, {
    resumeJobId: job.id
  });

  // Emit waiting status
  this.emitExecutionWaiting(execution, resumeAt);
}
```

### Socket.io Events for Step Progress

```typescript
// backend/src/socket/agentExecutionSocket.ts - additions

export interface StepStartedEvent {
  executionId: string;
  agentId: string;
  stepIndex: number;
  stepNumber: number;        // 1-based for display
  totalSteps: number;
  action: string;
  progress: number;          // Percentage
}

export interface StepCompletedEvent {
  executionId: string;
  agentId: string;
  stepIndex: number;
  stepNumber: number;
  totalSteps: number;
  status: 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: any;
  message: string;           // "Step 3 of 5 completed (60%)"
}

export interface ExecutionWaitingEvent {
  executionId: string;
  agentId: string;
  currentStep: number;
  resumeAt: Date;
  waitDuration: string;      // "5 days" for display
}

// Emit step progress
export const emitStepCompleted = (
  workspaceId: string,
  event: StepCompletedEvent
): void => {
  agentExecutionNamespace
    .to(`workspace:${workspaceId}:execution:${event.executionId}`)
    .emit('execution:step-completed', event);
};
```

### Resume Execution Job

```typescript
// backend/src/jobs/agentResumeExecutionJob.ts

import { Queue, Worker, Job } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import { AgentExecutionService } from '../services/AgentExecutionService';
import AgentExecution from '../models/AgentExecution';
import Agent from '../models/Agent';

export const agentResumeExecutionQueue = new Queue(
  'agent-resume-execution',
  defaultQueueOptions
);

export const startAgentResumeExecutionJob = (): void => {
  const worker = new Worker(
    'agent-resume-execution',
    async (job: Job) => {
      const { executionId, agentId, workspaceId, resumeFromStep } = job.data;

      // 1. Load execution record
      const execution = await AgentExecution.findById(executionId);
      if (!execution || execution.status !== 'waiting') {
        console.log(`[ResumeExecution] Execution ${executionId} not waiting, skipping`);
        return { success: false, reason: 'Execution not in waiting state' };
      }

      // 2. Check agent still exists and is Live
      const agent = await Agent.findById(agentId);
      if (!agent) {
        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'failed',
          error: { message: 'Agent deleted during wait period' }
        });
        return { success: false, reason: 'Agent deleted' };
      }

      if (agent.status === 'Paused') {
        await AgentExecution.findByIdAndUpdate(executionId, {
          status: 'failed',
          error: { message: 'Agent paused during wait period' }
        });
        return { success: false, reason: 'Agent paused' };
      }

      // 3. Restore execution context
      const restoredContext: IExecutionContext = {
        ...execution.savedContext,
        memory: new Map(Object.entries(execution.savedMemory || {}))
      };

      // 4. Update execution status to running
      await AgentExecution.findByIdAndUpdate(executionId, {
        status: 'running',
        savedContext: null,
        savedMemory: null,
        resumeAt: null
      });

      // 5. Parse remaining steps and continue execution
      const parsedSteps = await AgentExecutionService.parseAgentInstructions(agent);

      const result = await AgentExecutionService.executeStepsSequentially(
        execution,
        parsedSteps,
        restoredContext,
        resumeFromStep
      );

      return { success: true, result };
    },
    defaultWorkerOptions
  );

  worker.on('completed', (job, result) => {
    console.log(`[ResumeExecution] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ResumeExecution] Job ${job?.id} failed:`, err);
  });
};
```

### Memory Operations Pattern

```typescript
// Memory operations during step execution

// Writing to memory (in step execution)
if (step.action === 'save_to_memory') {
  const { key, value } = step.params;
  const resolvedValue = this.resolveVariables(value, context);
  context.memory.set(key, resolvedValue);

  return {
    success: true,
    data: { key, saved: true }
  };
}

// Reading from memory (in variable resolution)
private resolveMemoryVariable(
  variablePath: string,  // "@memory.processedContacts"
  context: IExecutionContext
): any {
  const key = variablePath.replace('@memory.', '');
  return context.memory.get(key);
}

// Example: Skip contacts in memory
// Instruction: "Skip contacts in @memory.processedContacts"
// Step: "Find contacts not in @memory.processedContacts"
if (step.action === 'search_contacts' && step.params.exclude) {
  const excludeList = this.resolveVariable(step.params.exclude, context);
  // excludeList = context.memory.get('processedContacts') = [contact1, contact2]

  const contacts = await Contact.find({
    workspace: context.workspaceId,
    _id: { $nin: excludeList.map(c => c._id) }
  });
}
```

### Key Files to Reference

| Purpose | File Path |
|---------|-----------|
| Execution Service | `backend/src/services/AgentExecutionService.ts:358-509` |
| AgentExecution Model | `backend/src/models/AgentExecution.ts` |
| Queue Config | `backend/src/events/queue/queue.config.ts:1-91` |
| Scheduled Job Pattern | `backend/src/jobs/agentScheduledJob.ts` |
| Event Trigger Job | `backend/src/jobs/agentEventTriggerJob.ts` |
| Socket.io Pattern | `backend/src/socket/agentExecutionSocket.ts` |
| Previous Story | `_bmad-output/implementation-artifacts/3-4-event-based-trigger-execution.md` |
| Epic Requirements | `_bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.5` |

### Project Structure Notes

- All new job files go in `backend/src/jobs/`
- Service extensions in `backend/src/services/AgentExecutionService.ts`
- Model extensions in `backend/src/models/AgentExecution.ts`
- Socket.io events in `backend/src/socket/agentExecutionSocket.ts`
- Queue config updates in `backend/src/events/queue/queue.config.ts`

### Critical Implementation Notes from Previous Stories

From Story 3.4 learnings:
- Use explicit worker startup in `server.ts` for new jobs
- Include traceability in job naming: `resume-${executionId}`
- Always check agent status before resuming execution
- Emit Socket.io events after state changes, not before
- Save to database before emitting events for consistency

### NFR Compliance

- **NFR1:** 80% of executions complete within 30 seconds - Multi-step adds latency but should still meet for most workflows
- **NFR35:** 90% success rate - Partial completion improves perceived success (steps 1-2 complete even if 3 fails)
- **Queue Optimization:** Resume jobs use minimal Redis commands - single delayed job per wait action

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-03-live-agent-execution.md#Story 3.5] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Background Jobs] - Queue patterns
- [Source: _bmad-output/implementation-artifacts/3-4-event-based-trigger-execution.md] - Previous story patterns
- [Source: backend/src/services/AgentExecutionService.ts:358-509] - Execution service API

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

