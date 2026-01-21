# Story 2.6: Test Result Performance

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-6-test-result-performance
**Status:** completed
**Priority:** High - Critical for developer iteration speed (NFR2, NFR41)
**FRs Covered:** FR41 (System can return test results within 10 seconds for 80% of runs)

---

## User Story

**As a** workspace owner,
**I want to** test results returned quickly,
**So that** I can iterate rapidly during agent development.

---

## Acceptance Criteria

### AC1: Simple Instructions Fast Response

**Given** I run a test with simple instructions
**When** The test executes
**Then** Results are returned in < 5 seconds
**And** I see a loading indicator during execution

### AC2: Complex Multi-Step Progressive Display

**Given** I run a test with complex multi-step instructions
**When** The test executes
**Then** Results are returned in < 10 seconds for 80% of tests (NFR2)
**And** Each step result streams as it completes (progressive display)

### AC3: Long Execution Progress Feedback

**Given** A test takes longer than expected
**When** Execution time exceeds 10 seconds
**Then** I see a progress message: "Test is taking longer than usual... Step 5 of 8 completed"
**And** I see an option to "Cancel Test"

### AC4: Large Dataset Query Limiting

**Given** Test Mode queries large datasets
**When** Instructions include "Find all contacts"
**Then** The query is limited to 100 records for testing
**And** I see note: "Limited to 100 records in Test Mode (Live mode processes all)"

### AC5: Web Search Real Execution with Caching

**Given** Test Mode includes Web Search action
**When** The search executes
**Then** Real web search is performed (not simulated)
**And** Results are returned within 5 seconds (NFR55)
**And** Search results are cached for 15 minutes

### AC6: Cached Parsing for Repeated Tests

**Given** I run the same test multiple times
**When** Test executes
**Then** Subsequent runs use cached parsing results
**And** Second run completes in ~50% less time

### AC7: Timeout with Partial Results

**Given** Test Mode times out after 30 seconds
**When** Execution exceeds timeout
**Then** I see error: "Test timed out after 30 seconds. Simplify instructions or break into multiple agents."
**And** Partial results (completed steps) are still displayed

---

## Tasks / Subtasks

- [x] Task 1: Configure Test Execution Timeout (AC: 7)
  - [x] 1.1: Add `TEST_TIMEOUT_MS = 30000` constant to TestModeService.ts
  - [x] 1.2: Implement AbortController pattern for timeout handling in `simulateExecution()`
  - [x] 1.3: Return partial results when timeout occurs (`timedOut: true` flag in response)
  - [x] 1.4: Add timeout error message to TestRunResult interface

- [x] Task 2: Implement Database Query Limiting (AC: 4)
  - [x] 2.1: Add `TEST_MODE_RECORD_LIMIT = 100` constant
  - [x] 2.2: Apply `.limit(100)` to all Contact/Opportunity queries in test mode
  - [x] 2.3: Add `isLimited: true` and `limitNote` fields to SearchPreview interface
  - [x] 2.4: Generate warning when limit is applied: "Limited to 100 records in Test Mode"

- [x] Task 3: Implement Instruction Parsing Cache (AC: 6)
  - [x] 3.1: Create cache key from instructions hash (SHA256 of normalized instructions)
  - [x] 3.2: Store parsed actions in Redis with 15-minute TTL
  - [x] 3.3: Check cache before calling InstructionParserService
  - [x] 3.4: Add `fromCache: boolean` and `cacheHit: boolean` to response
  - [x] 3.5: Track cache hit rate metric for monitoring

- [x] Task 4: Implement Web Search Caching (AC: 5)
  - [x] 4.1: Create cache key from search query hash
  - [x] 4.2: Store web search results in Redis with 15-minute TTL
  - [x] 4.3: Return cached results for identical queries
  - [x] 4.4: Add `cachedAt` timestamp to WebSearchPreview

- [x] Task 5: Implement Parallel Step Execution (AC: 1, 2)
  - [x] 5.1: Identify independent steps that can run in parallel (no data dependencies)
  - [x] 5.2: Use `Promise.all()` for parallel execution of independent steps
  - [x] 5.3: Maintain step order in results (execute parallel, return in order)
  - [x] 5.4: Add `parallelGroup` field to track which steps ran together

- [x] Task 6: Implement Progressive Streaming (AC: 2, 3)
  - [x] 6.1: Refactor test endpoint to use Server-Sent Events (SSE)
  - [x] 6.2: Emit step result as each step completes: `event: step, data: {...}`
  - [x] 6.3: Emit progress updates every 2 seconds: `event: progress, data: {step: 5, total: 8}`
  - [x] 6.4: Emit final result: `event: complete, data: {...}`
  - [x] 6.5: Handle client disconnect gracefully (abort test on disconnect)

- [x] Task 7: Implement Cancel Test Functionality (AC: 3)
  - [x] 7.1: Create DELETE `/api/workspaces/:workspaceId/agents/:agentId/test/:testRunId` endpoint
  - [x] 7.2: Store active test runs in Map with AbortController
  - [x] 7.3: Abort pending operations when cancel requested
  - [x] 7.4: Return partial results up to cancellation point

- [x] Task 8: Update Frontend TestModePanel for Streaming (AC: 2, 3)
  - [x] 8.1: Refactor useTestMode hook to use EventSource for SSE
  - [x] 8.2: Display steps progressively as they arrive
  - [x] 8.3: Show progress indicator: "Step X of Y completed"
  - [x] 8.4: Add "Cancel Test" button that appears after 5 seconds
  - [x] 8.5: Handle stream errors and reconnection

- [x] Task 9: Add Loading States and Indicators (AC: 1, 3)
  - [x] 9.1: Add spinner/loading animation while test runs
  - [x] 9.2: Show skeleton loaders for pending steps
  - [x] 9.3: Display elapsed time counter during execution
  - [x] 9.4: Show "Taking longer than usual..." message after 10 seconds

- [x] Task 10: Write Unit and Integration Tests (AC: all)
  - [x] 10.1: Test timeout handling with partial results
  - [x] 10.2: Test query limit enforcement (100 records max)
  - [x] 10.3: Test instruction parsing cache hit/miss
  - [x] 10.4: Test web search result caching
  - [x] 10.5: Test parallel step execution ordering
  - [x] 10.6: Test SSE streaming behavior
  - [x] 10.7: Test cancel functionality

---

## Dev Notes

### Critical Architecture Patterns

**EXISTING INFRASTRUCTURE - Built in Stories 2.1-2.5:**

The TestModeService (backend/src/services/TestModeService.ts) already has:

```typescript
// File: backend/src/services/TestModeService.ts

// Core interfaces already defined (lines 17-208):
export interface TestStepResult {
  stepNumber: number;
  action: string;
  actionLabel: string;
  icon: StepIcon;
  status: TestStepStatus;
  preview: { description: string; details?: Record<string, any> };
  richPreview?: StepPreview;
  duration: number;              // ← Already tracking duration per step
  estimatedCredits: number;      // ← Already tracking credits per step
  // ...
}

export interface TestRunResult {
  success: boolean;
  steps: TestStepResult[];
  totalEstimatedCredits: number;     // ← Already computed
  totalEstimatedDuration: number;    // ← Already computed
  estimates?: ExecutionEstimate;     // ← Added in Story 2-5
  // ...
}

// Credit costs per action (lines 242-267):
const CREDIT_COSTS: Record<string, number> = {
  send_email: 2, email: 2, linkedin_invite: 2, linkedin: 2,
  enrich_contact: 3, enrich: 3, web_search: 1,
  // Free actions: search, wait, conditional, etc.
};
```

**NEW: Timeout and Caching Constants**

```typescript
// File: backend/src/services/TestModeService.ts (ADD at top)

// Story 2.6: Performance constants
const TEST_TIMEOUT_MS = 30000;          // 30 second max execution
const TEST_MODE_RECORD_LIMIT = 100;     // Max records in test mode
const INSTRUCTION_CACHE_TTL = 900;      // 15 minutes in seconds
const WEB_SEARCH_CACHE_TTL = 900;       // 15 minutes in seconds
```

**NEW: Caching Layer**

```typescript
// File: backend/src/services/TestModeService.ts (ADD)

import crypto from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

function getCacheKey(type: 'instruction' | 'websearch', content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `testmode:${type}:${hash}`;
}

async function getCachedInstructions(instructions: string): Promise<ParsedAction[] | null> {
  const key = getCacheKey('instruction', instructions.toLowerCase().trim());
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedInstructions(instructions: string, parsed: ParsedAction[]): Promise<void> {
  const key = getCacheKey('instruction', instructions.toLowerCase().trim());
  await redis.setex(key, INSTRUCTION_CACHE_TTL, JSON.stringify(parsed));
}

async function getCachedWebSearch(query: string): Promise<WebSearchResult | null> {
  const key = getCacheKey('websearch', query.toLowerCase().trim());
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedWebSearch(query: string, result: WebSearchResult): Promise<void> {
  const key = getCacheKey('websearch', query.toLowerCase().trim());
  await redis.setex(key, WEB_SEARCH_CACHE_TTL, JSON.stringify(result));
}
```

**NEW: Timeout-Aware Execution**

```typescript
// File: backend/src/services/TestModeService.ts (MODIFY simulateExecution)

export async function simulateExecution(
  agentId: string,
  workspaceId: string,
  targetIds: string[],
  targetType: 'contact' | 'deal',
  options?: { signal?: AbortSignal }
): Promise<TestRunResult> {
  const startTime = Date.now();
  const steps: TestStepResult[] = [];
  let timedOut = false;

  // Create timeout controller
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TEST_TIMEOUT_MS);

  // Combine with external abort signal if provided
  const signal = options?.signal
    ? combineAbortSignals(options.signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    // Check instruction cache first
    const agent = await Agent.findById(agentId).lean();
    const cachedParsed = await getCachedInstructions(agent.instructions);

    let parsedActions: ParsedAction[];
    let fromCache = false;

    if (cachedParsed) {
      parsedActions = cachedParsed;
      fromCache = true;
    } else {
      parsedActions = await InstructionParserService.parse(agent.instructions);
      await setCachedInstructions(agent.instructions, parsedActions);
    }

    // Execute steps with abort checking
    for (const action of parsedActions) {
      if (signal.aborted) {
        timedOut = true;
        break;
      }

      const stepResult = await executeStep(action, workspaceId, targetIds, targetType, { signal });
      steps.push(stepResult);
    }

    return {
      success: !timedOut && steps.every(s => s.status !== 'error'),
      steps,
      timedOut,
      fromCache,
      totalEstimatedCredits: steps.reduce((sum, s) => sum + s.estimatedCredits, 0),
      totalEstimatedDuration: steps.reduce((sum, s) => sum + s.duration, 0),
      // Include timeout message if applicable
      error: timedOut
        ? 'Test timed out after 30 seconds. Simplify instructions or break into multiple agents.'
        : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

**NEW: Query Limiting for Test Mode**

```typescript
// File: backend/src/services/TestModeService.ts (MODIFY search step handler)

async function executeSearchStep(
  params: SearchParams,
  workspaceId: string
): Promise<TestStepResult> {
  // Apply test mode limit
  const query = Contact.find({
    workspace: workspaceId,
    ...buildQuery(params),
  }).limit(TEST_MODE_RECORD_LIMIT);

  const results = await query.lean();

  return {
    // ... other fields
    richPreview: {
      type: 'search',
      matchedCount: results.length,
      matches: results.slice(0, 5).map(formatContactPreview),
      hasMore: results.length === TEST_MODE_RECORD_LIMIT,
      isLimited: true,
      limitNote: 'Limited to 100 records in Test Mode (Live mode processes all)',
    } as SearchPreview,
  };
}
```

### SSE Streaming Implementation

```typescript
// File: backend/src/routes/agentTestRoutes.ts (NEW or UPDATE)

import { Router } from 'express';

const router = Router();

router.get(
  '/workspaces/:workspaceId/agents/:agentId/test/stream',
  authenticate,
  async (req, res) => {
    const { workspaceId, agentId } = req.params;
    const { targetIds, targetType } = req.query;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create abort controller for cancellation
    const abortController = new AbortController();
    const testRunId = generateTestRunId();

    // Store for cancel endpoint
    activeTests.set(testRunId, abortController);

    // Send test run ID
    res.write(`event: started\ndata: ${JSON.stringify({ testRunId })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      abortController.abort();
      activeTests.delete(testRunId);
    });

    try {
      // Stream execution with step-by-step updates
      await simulateExecutionStreaming(
        agentId,
        workspaceId,
        targetIds as string[],
        targetType as 'contact' | 'deal',
        {
          signal: abortController.signal,
          onStep: (step) => {
            res.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
          },
          onProgress: (current, total) => {
            res.write(`event: progress\ndata: ${JSON.stringify({ current, total })}\n\n`);
          },
        }
      );

      res.write(`event: complete\ndata: ${JSON.stringify({ success: true })}\n\n`);
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
      activeTests.delete(testRunId);
      res.end();
    }
  }
);

// Cancel endpoint
router.delete(
  '/workspaces/:workspaceId/agents/:agentId/test/:testRunId',
  authenticate,
  async (req, res) => {
    const { testRunId } = req.params;
    const controller = activeTests.get(testRunId);

    if (controller) {
      controller.abort();
      activeTests.delete(testRunId);
      res.json({ cancelled: true });
    } else {
      res.status(404).json({ error: 'Test run not found or already completed' });
    }
  }
);
```

### Frontend Streaming Hook

```typescript
// File: frontend/hooks/useTestModeStreaming.ts (NEW)

import { useState, useCallback, useRef } from 'react';
import type { TestStepResult } from '@/types/agent';

interface UseTestModeStreamingOptions {
  agentId: string;
  workspaceId: string;
}

export function useTestModeStreaming({ agentId, workspaceId }: UseTestModeStreamingOptions) {
  const [steps, setSteps] = useState<TestStepResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startTest = useCallback((targetIds: string[], targetType: 'contact' | 'deal') => {
    setIsRunning(true);
    setSteps([]);
    setProgress(null);

    const params = new URLSearchParams({
      targetIds: targetIds.join(','),
      targetType,
    });

    const url = `/api/workspaces/${workspaceId}/agents/${agentId}/test/stream?${params}`;
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('started', (e) => {
      const data = JSON.parse(e.data);
      setTestRunId(data.testRunId);
    });

    eventSource.addEventListener('step', (e) => {
      const step = JSON.parse(e.data);
      setSteps((prev) => [...prev, step]);
    });

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setProgress(data);
    });

    eventSource.addEventListener('complete', () => {
      setIsRunning(false);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      setIsRunning(false);
      eventSource.close();
    });
  }, [agentId, workspaceId]);

  const cancelTest = useCallback(async () => {
    if (testRunId && eventSourceRef.current) {
      eventSourceRef.current.close();
      await fetch(
        `/api/workspaces/${workspaceId}/agents/${agentId}/test/${testRunId}`,
        { method: 'DELETE', credentials: 'include' }
      );
      setIsRunning(false);
    }
  }, [testRunId, agentId, workspaceId]);

  return {
    steps,
    isRunning,
    progress,
    startTest,
    cancelTest,
  };
}
```

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Simple test execution | < 5 seconds | P95 latency |
| Complex test execution | < 10 seconds | P80 latency |
| Cache hit performance | ~50% faster | Compared to cache miss |
| Progressive update latency | < 200ms | Time between step completion and UI update |
| Timeout enforcement | 30 seconds | Hard limit with partial results |

---

## Project Structure Notes

**Backend Files:**

```
backend/src/
├── services/
│   ├── TestModeService.ts  [UPDATE] - Add timeout, caching, query limiting
│   └── TestModeService.test.ts  [UPDATE] - Add performance tests
├── routes/
│   └── agentTestRoutes.ts  [UPDATE] - Add SSE streaming endpoint, cancel endpoint
└── utils/
    └── testModeCache.ts  [NEW] - Redis caching utilities for test mode
```

**Frontend Files:**

```
frontend/
├── components/agents/
│   ├── TestModePanel.tsx  [UPDATE] - Support streaming, cancel button
│   ├── TestProgressIndicator.tsx  [NEW] - Progress bar with elapsed time
│   └── TestStepSkeleton.tsx  [NEW] - Skeleton loader for pending steps
├── hooks/
│   └── useTestModeStreaming.ts  [NEW] - SSE-based test execution hook
└── types/
    └── agent.ts  [UPDATE] - Add streaming types
```

---

## References

- [Source: PRD FR41](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/planning-artifacts/prd.md#testing-validation)
- [Source: PRD NFR2](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/planning-artifacts/prd.md#performance)
- [Source: Epics 2.6](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/planning-artifacts/epics.md#story-26-test-result-performance)
- [Source: Architecture - TestModeService](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/planning-artifacts/architecture.md#testmodeservice)
- [Source: Story 2-5 Implementation](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/implementation-artifacts/2-5-show-execution-estimates.md)

---

## Previous Story Intelligence

**From Story 2-5 (Show Execution Estimates):**

- TestModeService already tracks `duration` and `estimatedCredits` per step
- ExecutionEstimate interface with breakdowns is implemented
- localStorage pattern for storing previous test estimates
- ExecutionEstimatesPanel component displays time/credits
- CREDIT_COSTS constant defines per-action credit costs

**Key Patterns to Maintain:**

1. Interface definitions at top of service file
2. Rich preview types per action (SearchPreview, EmailPreview, etc.)
3. Test results include totalEstimatedCredits and totalEstimatedDuration
4. Frontend types mirror backend types in frontend/types/agent.ts

---

## Git Intelligence Summary

**Recent Commits:**

- `61a149a` - implemented 2-5
- `125804b` - implemented 2-4
- `e31c6b3` - code review 2-3 done
- `e22bd09` - implemented 2-1, 2-2

**Pattern:** Stories implemented incrementally, each building on previous. Commit messages use "implemented X-Y" format. Code review happens after implementation.

**Files Likely Touched:**

- backend/src/services/TestModeService.ts (heavily modified)
- frontend/components/agents/TestModePanel.tsx (modified in all stories)
- frontend/types/agent.ts (extended with new types)

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Story builds on TestModeService infrastructure from 2.1-2.5
- Key new work: SSE streaming, Redis caching, timeout handling
- Frontend needs new hook for streaming pattern (replaces fetch-based approach)
- Must maintain backward compatibility with existing TestRunResult interface
- Performance targets: P95 < 5s simple, P80 < 10s complex

### File List

- backend/src/services/TestModeService.ts (UPDATE)
- backend/src/services/TestModeService.test.ts (UPDATE)
- backend/src/routes/agentBuilder.ts (UPDATE) - SSE streaming and cancel endpoints
- backend/src/controllers/agentController.ts (UPDATE) - testAgentStream and cancelTest handlers
- backend/src/utils/testModeCache.ts (NEW)
- backend/src/utils/testModeCache.test.ts (NEW)
- frontend/components/agents/TestModePanel.tsx (UPDATE)
- frontend/components/agents/TestProgressIndicator.tsx (NEW)
- frontend/components/agents/TestStepSkeleton.tsx (NEW)
- frontend/hooks/useTestModeStreaming.ts (NEW)
- frontend/hooks/useTestModeStreaming.test.ts (NEW)
- frontend/types/agent.ts (UPDATE)
