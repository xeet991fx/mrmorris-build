# Agent Execution Flow - Complete Technical Guide

## Overview

When an agent executes, it goes through a multi-step process that parses instructions, executes actions sequentially, and logs results. Here's the complete flow with code references.

---

## 🔄 High-Level Execution Flow

```
Trigger (Manual/Scheduled/Event)
    ↓
AgentExecutionService.executeAgent()
    ↓
Parse Instructions → InstructionParserService
    ↓
Validate Instructions → InstructionValidationService
    ↓
Execute Actions (Loop through each action)
    ├─ Conditional Actions → ConditionEvaluator
    ├─ Wait Actions → Schedule Resume Job
    └─ Regular Actions → ActionExecutorService
        ├─ send_email → GmailService
        ├─ linkedin_invite → LinkedInService
        ├─ web_search → WebSearchService
        ├─ create_task → Task Model
        ├─ add_tag/remove_tag → Contact/Opportunity Model
        ├─ update_field → Contact/Opportunity Model
        ├─ enrich_contact → ApolloService
        └─ human_handoff → Create Notification
    ↓
Record Results → AgentExecution Model
    ↓
Emit Socket.io Events → Real-time Progress Updates
```

---

## 📁 Key Files & Their Roles

### 1. **AgentExecutionService.ts** (Main Orchestrator)
**Location:** `backend/src/services/AgentExecutionService.ts`

**Key Method:** `executeAgent()` (Line 432)

**Responsibilities:**
- Create execution record in database
- Load agent configuration
- Parse instructions (if not already parsed)
- Build execution context
- Loop through actions and execute them
- Handle conditionals and nested logic
- Emit Socket.io progress events
- Record results

### 2. **InstructionParserService.ts** (Instruction Parser)
**Location:** `backend/src/services/InstructionParserService.ts`

**Key Method:** `parseInstructions()` (Line 342)

**Responsibilities:**
- Convert natural language instructions → structured JSON actions
- Uses Gemini 2.5 Pro for parsing
- Supports conditionals, variables, and complex logic
- Caches parsed results (5-minute TTL)

### 3. **ActionExecutorService.ts** (Action Executor)
**Location:** `backend/src/services/ActionExecutorService.ts`

**Key Method:** `executeAction()` (Line 1866)

**Responsibilities:**
- Routes actions to appropriate handlers
- Executes individual actions (email, LinkedIn, search, etc.)
- Handles rate limiting
- Logs activities
- Auto-pauses agents on errors/limits

### 4. **ConditionEvaluator.ts** (Conditional Logic)
**Location:** `backend/src/utils/ConditionEvaluator.ts`

**Responsibilities:**
- Evaluates simple conditions (`deal.value > 50000`)
- Evaluates compound conditions with AND/OR logic
- Resolves variables from context
- Returns boolean result + explanation

---

## 🔍 Detailed Step-by-Step Flow

### **Step 1: Trigger Agent Execution**

**File:** `backend/src/controllers/agentController.ts`
**Method:** `executeAgent()` (Line ~1200)

```typescript
// User clicks "Run" or scheduled trigger fires
POST /api/workspaces/:workspaceId/agents/:agentId/execute
```

**What happens:**
1. Validates user has permission to run agent
2. Calls `AgentExecutionService.executeAgent()`

---

### **Step 2: Create Execution Record**

**File:** `AgentExecutionService.ts` (Line 447-472)

```typescript
// Create AgentExecution document with status: 'pending'
executionRecord = await AgentExecution.create({
  executionId,
  agent: agentId,
  workspace: workspaceId,
  status: 'pending',
  trigger: { type: 'manual' },
  steps: [],
  startedAt: new Date(),
});
```

**Database Model:** `AgentExecution`
**Status:** `pending` → `running` → `completed`/`failed`/`cancelled`

---

### **Step 3: Load Agent Configuration**

**File:** `AgentExecutionService.ts` (Line 475-483)

```typescript
// Load agent from database
const agent = await Agent.findOne({
  _id: agentId,
  workspace: workspaceId
});

// Verify agent is Live
if (agent.status !== 'Live') {
  throw new Error(`Agent is not live. Current status: ${agent.status}`);
}
```

---

### **Step 4: Parse Instructions**

**File:** `AgentExecutionService.ts` (Line 557-576)

```typescript
let parsedActions = agent.parsedActions || [];

if (!parsedActions.length && agent.instructions) {
  // Parse using InstructionParserService
  const parseResult = await InstructionParserService.parseInstructions(
    agent.instructions,
    workspaceId
  );

  parsedActions = parseResult.actions;

  // Cache parsed actions on agent
  agent.parsedActions = parsedActions;
  await agent.save();
}
```

**InstructionParserService Flow:**
1. Checks in-memory cache (5-minute TTL)
2. If not cached, calls Gemini 2.5 Pro with sales-specific prompt
3. Parses natural language → structured JSON actions
4. Validates action types and parameters
5. Returns `ParsedAction[]`

**Example Parsed Action:**
```json
{
  "type": "conditional",
  "condition": "deal.value > 50000",
  "trueBranch": [
    { "type": "send_email", "template": "urgent_followup", "order": 1 }
  ],
  "falseBranch": [
    { "type": "send_email", "template": "standard_followup", "order": 1 }
  ],
  "order": 1
}
```

---

### **Step 5: Build Execution Context**

**File:** `AgentExecutionService.ts` (Line 506-555)

```typescript
const context: ExecutionContext = {
  workspaceId,
  agentId,
  executionId,
  contact: loadedContact,  // If target is contact
  deal: loadedDeal,        // If target is deal
  memory: new Map(),       // Agent memory variables
  variables: {},           // Runtime variables
  stepOutputs: {},         // Output from previous steps
  currentStep: 0,
  totalSteps: parsedActions.length,
};
```

**Context is used for:**
- Variable resolution (`@contact.firstName`, `@deal.value`)
- Condition evaluation
- Data passing between steps

---

### **Step 6: Execute Actions Loop**

**File:** `AgentExecutionService.ts` (Line 605-820)

```typescript
for (const action of parsedActions) {
  // Check for cancellation
  if (options.signal?.aborted) {
    executionRecord.status = 'cancelled';
    break;
  }

  // Handle different action types
  if (action.type === 'conditional') {
    // Handle conditional logic (Step 6a)
  } else if (action.type === 'wait') {
    // Handle wait action (Step 6b)
  } else {
    // Execute regular action (Step 6c)
  }

  stepNumber++;
}
```

---

### **Step 6a: Conditional Actions**

**File:** `AgentExecutionService.ts` (Line 651-780)

```typescript
if (action.type === 'conditional') {
  // Evaluate condition using ConditionEvaluator
  let conditionResult = ConditionEvaluator.evaluate(
    action.condition,
    context
  );

  // Log condition evaluation
  steps.push({
    stepNumber,
    action: 'conditional',
    result: {
      conditionResult: conditionResult.result,
      description: conditionResult.explanation,
    }
  });

  // Execute appropriate branch
  const activeBranch = conditionResult.result
    ? action.trueBranch
    : action.falseBranch;

  for (const branchAction of activeBranch) {
    const branchResult = await this.executeAction(branchAction, context);
    steps.push({ ...branchResult });
  }
}
```

**ConditionEvaluator Process:**
1. Parses condition string (`deal.value > 50000`)
2. Resolves variables from context
3. Evaluates using comparison operators
4. Returns `{ result: true/false, explanation: "..." }`

---

### **Step 6b: Wait Actions**

**File:** `AgentExecutionService.ts` (Line 784-850)

```typescript
if (action.type === 'wait') {
  const waitDuration = parseWaitDuration(action.duration); // e.g., "5 days" → ms

  // Short waits (< 5 min): execute synchronously
  if (waitDuration < 5 * 60 * 1000) {
    await this.executeAction(action, context);
    stepNumber++;
    continue;
  }

  // Long waits: save state & schedule resume job
  const resumeAt = new Date(Date.now() + waitDuration);

  executionRecord.status = 'waiting';
  executionRecord.waitingUntil = resumeAt;
  executionRecord.resumeFromStep = stepNumber + 1;

  // Schedule resume job in BullMQ
  await agentResumeQueue.add('resume-execution', {
    executionId,
    agentId,
    workspaceId,
    resumeFromStep: stepNumber + 1,
  }, { delay: waitDuration });

  break; // Exit loop - will resume later
}
```

---

### **Step 6c: Regular Actions**

**File:** `AgentExecutionService.ts` (Line 1068-1077)

```typescript
private static async executeAction(
  action: ParsedAction,
  context: ExecutionContext
): Promise<ActionResult> {
  // Resolve variables in action parameters
  const resolvedAction = this.resolveActionVariables(action, context);

  // Execute using ActionExecutorService
  return ActionExecutorService.executeAction(resolvedAction, context);
}
```

**ActionExecutorService Router (Line 1866-1931):**

```typescript
static async executeAction(action, context): Promise<ActionResult> {
  switch (action.type) {
    case 'send_email':
      return executeSendEmail(action, context);
    case 'linkedin_invite':
      return executeLinkedInInvite(action, context);
    case 'web_search':
      return executeWebSearch(action, context);
    case 'create_task':
      return executeCreateTask(action, context);
    case 'add_tag':
      return executeTagAction(action, context, 'add');
    case 'update_field':
      return executeUpdateField(action, context);
    case 'enrich_contact':
      return executeEnrichContact(action, context);
    case 'search':
      return executeSearch(action, context);
    // ... more actions
  }
}
```

---

### **Step 7: Action-Specific Execution**

#### **Example: Send Email Action**

**File:** `ActionExecutorService.ts` (Line 452-560)

```typescript
async function executeSendEmail(action, context): Promise<ActionResult> {
  // 1. Get recipient (from action or context.contact)
  let to = action.to || context.contact?.email;

  // 2. Check rate limit (100 emails/day)
  const rateLimit = await checkActionRateLimit('send_email', context);
  if (!rateLimit.allowed) {
    await autoPauseAgent(context.agentId, 'Email limit reached');
    return { success: false, error: 'Rate limit exceeded' };
  }

  // 3. Load email template (if specified)
  if (action.template) {
    const template = await EmailTemplate.findOne({
      name: action.template,
      workspace: context.workspaceId
    });
    subject = template.subject;
    body = template.body;
  }

  // 4. Resolve variables in subject/body
  subject = resolveEmailVariables(subject, context);
  // @contact.firstName → "John"
  // @deal.value → "75000"

  // 5. Send via Gmail API
  const result = await GmailService.sendEmailWithWorkspaceAccount(
    context.workspaceId,
    to,
    subject,
    body
  );

  // 6. Log activity
  await Activity.create({
    workspace: context.workspaceId,
    contact: context.contact?._id,
    type: 'email_sent',
    description: `Email sent: ${subject}`,
    metadata: { to, subject, executionId: context.executionId }
  });

  // 7. Return result
  return {
    success: true,
    description: `Email sent to ${to}`,
    recipients: [to],
    durationMs: Date.now() - startTime,
  };
}
```

---

### **Step 8: Record Results**

**File:** `AgentExecutionService.ts` (Line 960-1050)

```typescript
// Save all steps to execution record
executionRecord.steps = steps;
executionRecord.status = hasError ? 'failed' : 'completed';
executionRecord.completedAt = new Date();
executionRecord.summary = {
  totalSteps: steps.length,
  successfulSteps: steps.filter(s => s.result.success).length,
  failedSteps: steps.filter(s => !s.result.success).length,
  totalCreditsUsed,
  totalDurationMs: Date.now() - startTime,
};

await executionRecord.save();
```

---

### **Step 9: Emit Socket.io Events**

**File:** `AgentExecutionService.ts` (Throughout execution)

```typescript
// Execution started
emitExecutionStarted(workspaceId, agentId, {
  executionId,
  startedAt: new Date(),
});

// Progress for each step
emitExecutionProgress(workspaceId, agentId, {
  executionId,
  step: stepNumber,
  total: totalSteps,
  action: action.type,
  status: 'success',
  message: 'Email sent successfully',
});

// Execution completed
emitExecutionCompleted(workspaceId, agentId, {
  executionId,
  status: 'completed',
  summary: executionRecord.summary,
});
```

**Frontend listens to these events for real-time updates!**

---

## 🎯 Key Concepts

### **Variable Resolution**

Variables like `@contact.firstName` are resolved at runtime:

```typescript
function resolveVariables(template: string, context: ExecutionContext): string {
  return template.replace(/@(\w+(?:\.\w+)?)/g, (match, varName) => {
    // @contact.firstName → context.contact.firstName
    if (varName.startsWith('contact.')) {
      return context.contact?.[varName.replace('contact.', '')] || match;
    }
    // @deal.value → context.deal.value
    if (varName.startsWith('deal.')) {
      return context.deal?.[varName.replace('deal.', '')] || match;
    }
    // @memory.varName → context.memory.get('varName')
    if (varName.startsWith('memory.')) {
      return context.memory.get(varName.replace('memory.', '')) || match;
    }
    return match;
  });
}
```

---

### **Error Handling & Retries**

Each action has retry logic with exponential backoff:

```typescript
async function executeWithRetry(fn, retryConfig) {
  let lastError;
  for (let i = 0; i < retryConfig.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await sleep(retryConfig.delayMs * Math.pow(retryConfig.backoffMultiplier, i));
    }
  }
  throw lastError;
}
```

---

### **Rate Limiting**

Prevents agents from exceeding API limits:

```typescript
const ACTION_RATE_LIMITS = {
  send_email: 100,      // Max 100 emails/day
  linkedin_invite: 100, // Max 100 LinkedIn invites/day
};

// If limit exceeded → auto-pause agent
if (!rateLimit.allowed) {
  agent.status = 'Paused';
  agent.pauseReason = 'Email limit reached (100/day)';
  await agent.save();
}
```

---

## 📊 Database Models

### **AgentExecution**
Stores execution results for each run:
```typescript
{
  executionId: "exec_abc123",
  agent: ObjectId("..."),
  workspace: ObjectId("..."),
  status: "completed",
  trigger: { type: "manual" },
  target: { type: "contact", id: "..." },
  steps: [
    {
      stepNumber: 1,
      action: "conditional",
      result: { conditionResult: true, description: "..." },
      executedAt: Date,
      durationMs: 50,
      creditsUsed: 0
    },
    {
      stepNumber: 2,
      action: "send_email",
      result: { success: true, recipients: ["..."] },
      executedAt: Date,
      durationMs: 500,
      creditsUsed: 2
    }
  ],
  summary: {
    totalSteps: 6,
    successfulSteps: 6,
    failedSteps: 0,
    totalCreditsUsed: 4,
    totalDurationMs: 1200
  }
}
```

---

## 🚀 Complete Example: Deal Value Conditional

**Instructions:**
```
If deal value > $50,000:
  Assign to senior sales rep
  Add tag "enterprise"
  Create task "Schedule discovery call"
Else:
  Assign to sales development rep
  Send automated email template "SMB Outreach"
```

**Parsed Actions:**
```json
[
  {
    "type": "conditional",
    "condition": "deal.value > 50000",
    "trueBranch": [
      { "type": "update_field", "field": "assignee", "value": "senior-rep-id", "order": 1 },
      { "type": "add_tag", "tag": "enterprise", "order": 2 },
      { "type": "create_task", "title": "Schedule discovery call", "order": 3 }
    ],
    "falseBranch": [
      { "type": "update_field", "field": "assignee", "value": "sdr-id", "order": 1 },
      { "type": "send_email", "template": "SMB Outreach", "order": 2 }
    ],
    "order": 1
  }
]
```

**Execution Flow:**
1. Load deal: `{ _id: "...", value: 75000, ... }`
2. Evaluate condition: `deal.value (75000) > 50000` → **TRUE**
3. Execute trueBranch:
   - Update assignee field → "senior-rep-id"
   - Add tag "enterprise"
   - Create task "Schedule discovery call"
4. Skip falseBranch
5. Log 4 steps (1 conditional + 3 actions)
6. Save execution record
7. Emit completion event

---

## 🔗 File Reference Summary

| File | Purpose | Key Methods |
|------|---------|-------------|
| `AgentExecutionService.ts` | Main orchestrator | `executeAgent()`, `executeAction()` |
| `InstructionParserService.ts` | Parses natural language | `parseInstructions()` |
| `ActionExecutorService.ts` | Executes individual actions | `executeAction()`, `executeSendEmail()`, etc. |
| `ConditionEvaluator.ts` | Evaluates conditionals | `evaluate()`, `evaluateCompound()` |
| `GmailService.ts` | Sends emails via Gmail API | `sendEmailWithWorkspaceAccount()` |
| `LinkedInService.ts` | Sends LinkedIn invites | `sendConnectionRequest()` |
| `ApolloService.ts` | Enriches contacts | `enrichContact()` |
| `WebSearchService.ts` | Web search functionality | `search()` |
| `agentController.ts` | HTTP endpoints | `executeAgent()`, `testAgent()` |

---

## 🎓 Key Takeaways

1. **Instructions are parsed once** and cached on the agent document
2. **Actions execute sequentially** in the order specified
3. **Conditionals are evaluated** using ConditionEvaluator with context
4. **Variables are resolved** at runtime from context (contact, deal, memory)
5. **Rate limiting prevents abuse** and auto-pauses agents
6. **Socket.io provides real-time progress** to the frontend
7. **Long waits (>5 min) are scheduled** using BullMQ jobs
8. **All executions are logged** in AgentExecution model for auditing

This architecture ensures reliable, scalable, and auditable agent executions! 🚀
