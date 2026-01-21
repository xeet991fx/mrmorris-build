# Story 2.5: Show Execution Estimates

**Epic:** Epic 2 - Safe Agent Testing
**Story Key:** 2-5-show-execution-estimates
**Status:** done
**Priority:** Medium - Enhances user understanding of resource requirements
**FRs Covered:** FR39 (System can show estimated execution time and AI credit cost for tests)

---

## User Story

**As a** workspace owner,
**I want to** see estimated execution time and AI credit cost for my test,
**So that** I can understand the resource requirements before going live.

---

## Acceptance Criteria

### AC1: Display Estimates After Test Run

**Given** I run a test in Test Mode
**When** The test completes
**Then** I see execution time estimate: "Estimated execution time: 12 seconds"
**And** I see AI credit cost estimate: "Estimated cost: 3 AI credits"

### AC2: Simple Instructions Zero Cost

**Given** An agent has simple instructions (no AI parsing required)
**When** Test executes
**Then** Estimated time: < 5 seconds
**And** Estimated cost: 0 credits (no AI operations)

### AC3: AI Copilot Content Cost

**Given** An agent uses AI Copilot-generated content
**When** Test executes
**Then** Estimated cost includes: Instruction parsing (2 credits) + variable resolution (1 credit) = 3 credits

### AC4: Wait Time Display

**Given** An agent has "Wait 5 days" instruction
**When** Test executes
**Then** Estimated time shows: "12 seconds active + 5 days wait time"
**And** Wait time is clearly distinguished from active execution time

### AC5: Conditional Branch Estimates

**Given** An agent has multiple conditional branches
**When** Test executes
**Then** Estimated time shows worst-case scenario: "15-30 seconds (depends on conditions)"

### AC6: Bulk Action Estimates

**Given** An agent sends 50 emails
**When** Test executes
**Then** Estimated time: "~25 seconds (50 emails × 0.5s per email)"
**And** Estimated cost: "5 credits (instruction parsing + email personalization)"

### AC7: Consistent Re-Run Estimates

**Given** Test Mode runs multiple times
**When** I run the same test again
**Then** The estimates remain consistent
**And** I see: "Previous test: 12s / 3 credits"

### AC8: Scheduled Agent Projections

**Given** I have a scheduled agent
**When** I view execution estimates
**Then** I see daily/monthly projections: "Running daily: ~90 credits/month"

---

## Tasks / Subtasks

- [x] Task 1: Extend TestModeService for Enhanced Estimates (AC: 1, 2, 3, 4, 5, 6)
  - [x] 1.1: Add `ExecutionEstimate` interface with `activeTime`, `waitTime`, `totalCredits`, `breakdown`
  - [x] 1.2: Implement `calculateExecutionEstimates()` method that aggregates step durations and credits
  - [x] 1.3: Add wait time detection and separation from active execution time
  - [x] 1.4: Implement conditional branch worst-case estimation (sum all branches)
  - [x] 1.5: Add bulk action detection and multiplier estimation for email/linkedin actions
  - [x] 1.6: Add instruction parsing credit cost (2 credits base for AI parsing)

- [x] Task 2: Add Estimate Fields to TestRunResult (AC: 1)
  - [x] 2.1: Extend `TestRunResult` interface with `estimates` object in `backend/src/services/TestModeService.ts`
  - [x] 2.2: Populate estimates in `simulateExecution()` return value
  - [x] 2.3: Include breakdown by action type for transparency

- [x] Task 3: Create ExecutionEstimatesPanel Component (AC: 1, 2, 3, 4, 5, 6)
  - [x] 3.1: Create `frontend/components/agents/ExecutionEstimatesPanel.tsx`
  - [x] 3.2: Display estimated execution time with icon (clock)
  - [x] 3.3: Display estimated AI credits with icon (coin/bolt)
  - [x] 3.4: Show breakdown tooltip on hover: "Parsing (2) + Emails (3) = 5 credits"
  - [x] 3.5: Distinguish active time vs wait time visually
  - [x] 3.6: Show range for conditional branches: "15-30 seconds"

- [x] Task 4: Integrate with TestModePanel (AC: 1)
  - [x] 4.1: Import and add ExecutionEstimatesPanel to TestModePanel.tsx
  - [x] 4.2: Display prominently below test results summary
  - [x] 4.3: Pass test result estimates to component

- [x] Task 5: Add Estimate Types to Frontend (AC: all)
  - [x] 5.1: Add `ExecutionEstimate`, `EstimateBreakdown` interfaces to `frontend/types/agent.ts`
  - [x] 5.2: Extend `TestRunResult` type with estimates field
  - [x] 5.3: Add `ScheduledProjection` interface for recurring agent estimates

- [x] Task 6: Implement Previous Test Comparison (AC: 7)
  - [x] 6.1: Store last test estimates in localStorage with agentId key
  - [x] 6.2: Display comparison: "Previous test: 12s / 3 credits" below current estimates
  - [x] 6.3: Show delta indicators (↑/↓) if estimates changed significantly

- [x] Task 7: Implement Scheduled Agent Projections (AC: 8)
  - [x] 7.1: Create `calculateScheduledProjections()` utility function
  - [x] 7.2: Calculate daily/weekly/monthly credit usage based on trigger schedule
  - [x] 7.3: Display projection in ScheduledProjectionCard component
  - [x] 7.4: Show warning if monthly projection exceeds workspace credit allocation

- [x] Task 8: Write Unit Tests (AC: all)
  - [x] 8.1: Add tests to `TestModeService.test.ts` for estimate calculations
  - [x] 8.2: Test wait time extraction and separation
  - [x] 8.3: Test bulk action multiplier estimation
  - [x] 8.4: Test scheduled projection calculations

---

## Dev Notes

### Critical Architecture Patterns

**EXISTING INFRASTRUCTURE - Already Implemented in TestModeService.ts:**

The TestModeService already has the foundation for this story:

```typescript
// File: backend/src/services/TestModeService.ts (existing code)

// Credit costs per action type (line 242-267)
const CREDIT_COSTS: Record<string, number> = {
  send_email: 2,
  email: 2,
  linkedin_invite: 2,
  linkedin: 2,
  enrich_contact: 3,
  enrich: 3,
  web_search: 1,
  // Free actions
  search: 0, find: 0, wait: 0, delay: 0, conditional: 0,
  if: 0, create_task: 0, task: 0, add_tag: 0, remove_tag: 0,
  tag: 0, update_field: 0, update: 0, update_deal_value: 0,
  human_handoff: 0, handoff: 0,
};

// Each TestStepResult already has duration and estimatedCredits fields (line 126-149)
export interface TestStepResult {
  stepNumber: number;
  // ...
  duration: number;           // ← Already tracking duration per step
  estimatedCredits: number;   // ← Already tracking credits per step
  // ...
}

// TestRunResult already has totals (line 151-164)
export interface TestRunResult {
  success: boolean;
  steps: TestStepResult[];
  totalEstimatedCredits: number;    // ← Ready to use
  totalEstimatedDuration: number;   // ← Ready to use
  // ...
}
```

**NEW: ExecutionEstimate Interface**

```typescript
// Add to backend/src/services/TestModeService.ts

export interface EstimateBreakdown {
  category: 'parsing' | 'email' | 'linkedin' | 'enrich' | 'web_search' | 'other';
  label: string;
  credits: number;
  duration: number;
}

export interface ExecutionEstimate {
  // Time estimates
  activeTimeMs: number;           // Actual execution time
  waitTimeMs: number;             // Wait/delay time (days → ms)
  totalTimeMs: number;            // activeTimeMs + waitTimeMs
  timeRangeMs?: {                 // For conditional branches
    min: number;
    max: number;
  };

  // Credit estimates
  totalCredits: number;
  creditBreakdown: EstimateBreakdown[];
  parsingCredits: number;         // Base 2 credits for AI parsing

  // Display helpers
  activeTimeDisplay: string;      // "12 seconds"
  waitTimeDisplay: string | null; // "5 days" or null
  creditsDisplay: string;         // "5 AI credits"

  // Scheduled projections (if agent has schedule)
  dailyProjection?: number;
  monthlyProjection?: number;
}
```

**Calculate Estimates Method**

```typescript
// File: backend/src/services/TestModeService.ts (ADD)

export function calculateExecutionEstimates(
  steps: TestStepResult[],
  agent: { triggers?: Array<{ type: string; config?: any }> }
): ExecutionEstimate {
  let activeTimeMs = 0;
  let waitTimeMs = 0;
  let totalCredits = 0;
  const breakdowns: EstimateBreakdown[] = [];

  // Add base parsing cost
  const parsingCredits = 2;
  totalCredits += parsingCredits;
  breakdowns.push({
    category: 'parsing',
    label: 'Instruction Parsing',
    credits: parsingCredits,
    duration: 0,
  });

  // Aggregate from steps
  for (const step of steps) {
    // Separate wait time from active time
    if (step.action === 'wait' || step.action === 'delay') {
      const waitPreview = step.richPreview as WaitPreview | undefined;
      if (waitPreview) {
        waitTimeMs += convertToMs(waitPreview.duration, waitPreview.unit);
      }
    } else {
      activeTimeMs += step.duration;
    }

    totalCredits += step.estimatedCredits;

    // Build breakdown by category
    if (step.estimatedCredits > 0) {
      const category = getCreditCategory(step.action);
      const existing = breakdowns.find(b => b.category === category);
      if (existing) {
        existing.credits += step.estimatedCredits;
        existing.duration += step.duration;
      } else {
        breakdowns.push({
          category,
          label: step.actionLabel,
          credits: step.estimatedCredits,
          duration: step.duration,
        });
      }
    }
  }

  // Calculate scheduled projections
  let dailyProjection: number | undefined;
  let monthlyProjection: number | undefined;

  const scheduledTrigger = agent.triggers?.find(t => t.type === 'scheduled');
  if (scheduledTrigger) {
    const runsPerDay = calculateRunsPerDay(scheduledTrigger.config);
    dailyProjection = totalCredits * runsPerDay;
    monthlyProjection = dailyProjection * 30;
  }

  return {
    activeTimeMs,
    waitTimeMs,
    totalTimeMs: activeTimeMs + waitTimeMs,
    totalCredits,
    creditBreakdown: breakdowns,
    parsingCredits,
    activeTimeDisplay: formatDuration(activeTimeMs),
    waitTimeDisplay: waitTimeMs > 0 ? formatDuration(waitTimeMs) : null,
    creditsDisplay: `${totalCredits} AI credit${totalCredits !== 1 ? 's' : ''}`,
    dailyProjection,
    monthlyProjection,
  };
}

function convertToMs(duration: number, unit: string): number {
  switch (unit) {
    case 'seconds': return duration * 1000;
    case 'minutes': return duration * 60 * 1000;
    case 'hours': return duration * 60 * 60 * 1000;
    case 'days': return duration * 24 * 60 * 60 * 1000;
    default: return duration * 1000;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)} hours`;
  return `${Math.round(ms / 86400000)} days`;
}

function getCreditCategory(action: string): EstimateBreakdown['category'] {
  if (['send_email', 'email'].includes(action)) return 'email';
  if (['linkedin_invite', 'linkedin'].includes(action)) return 'linkedin';
  if (['enrich_contact', 'enrich'].includes(action)) return 'enrich';
  if (['web_search'].includes(action)) return 'web_search';
  return 'other';
}

function calculateRunsPerDay(config: any): number {
  if (!config) return 1;
  switch (config.frequency) {
    case 'hourly': return 24;
    case 'daily': return 1;
    case 'weekly': return 1 / 7;
    case 'monthly': return 1 / 30;
    default: return 1;
  }
}
```

### Frontend Component Structure

```tsx
// File: frontend/components/agents/ExecutionEstimatesPanel.tsx

import { Clock, Coins, TrendingUp, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { ExecutionEstimate } from '@/types/agent';

interface ExecutionEstimatesPanelProps {
  estimates: ExecutionEstimate | null;
  previousEstimates?: { time: number; credits: number } | null;
  showProjections?: boolean;
}

export function ExecutionEstimatesPanel({
  estimates,
  previousEstimates,
  showProjections = true,
}: ExecutionEstimatesPanelProps) {
  if (!estimates) return null;

  const hasWaitTime = estimates.waitTimeDisplay !== null;

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
      {/* Execution Time */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <span className="font-medium">
            {hasWaitTime
              ? `${estimates.activeTimeDisplay} active`
              : estimates.activeTimeDisplay
            }
          </span>
          {hasWaitTime && (
            <span className="text-muted-foreground ml-1">
              + {estimates.waitTimeDisplay} wait
            </span>
          )}
        </div>
      </div>

      {/* AI Credits */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{estimates.creditsDisplay}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium mb-1">Credit Breakdown:</p>
            {estimates.creditBreakdown.map((item, i) => (
              <p key={i}>
                {item.label}: {item.credits} credit{item.credits !== 1 ? 's' : ''}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Previous Test Comparison */}
      {previousEstimates && (
        <div className="text-sm text-muted-foreground">
          <span>Previous: {formatMs(previousEstimates.time)} / {previousEstimates.credits} credits</span>
        </div>
      )}

      {/* Monthly Projection for Scheduled Agents */}
      {showProjections && estimates.monthlyProjection && (
        <div className="flex items-center gap-2 ml-auto">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="text-sm">
            ~{estimates.monthlyProjection} credits/month
          </span>
          {estimates.monthlyProjection > 100 && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                High monthly usage. Monitor credit consumption.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
```

### Frontend Types

```typescript
// File: frontend/types/agent.ts (ADD)

// Story 2.5: Execution Estimates types
export interface EstimateBreakdown {
  category: 'parsing' | 'email' | 'linkedin' | 'enrich' | 'web_search' | 'other';
  label: string;
  credits: number;
  duration: number;
}

export interface ExecutionEstimate {
  activeTimeMs: number;
  waitTimeMs: number;
  totalTimeMs: number;
  timeRangeMs?: { min: number; max: number };
  totalCredits: number;
  creditBreakdown: EstimateBreakdown[];
  parsingCredits: number;
  activeTimeDisplay: string;
  waitTimeDisplay: string | null;
  creditsDisplay: string;
  dailyProjection?: number;
  monthlyProjection?: number;
}

// Extend existing TestRunResult
export interface TestRunResult {
  success: boolean;
  error?: string;
  steps: TestStepResult[];
  totalEstimatedCredits: number;
  totalEstimatedDuration: number;
  warnings: TestWarning[];
  failedAtStep?: number;
  estimates?: ExecutionEstimate;  // NEW
}
```

### Local Storage for Previous Estimates

```typescript
// File: frontend/lib/utils/testEstimatesStorage.ts

const STORAGE_KEY_PREFIX = 'agent_test_estimates_';

export interface StoredEstimate {
  time: number;
  credits: number;
  timestamp: string;
}

export function saveTestEstimate(agentId: string, estimate: StoredEstimate): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${agentId}`,
      JSON.stringify(estimate)
    );
  } catch {
    // Ignore storage errors
  }
}

export function getPreviousEstimate(agentId: string): StoredEstimate | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${agentId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
```

---

## Project Structure Notes

**Backend Files:**

```
backend/src/
├── services/
│   ├── TestModeService.ts  [UPDATE] - Add calculateExecutionEstimates(), ExecutionEstimate interface
│   └── TestModeService.test.ts  [UPDATE] - Add estimate calculation tests
```

**Frontend Files:**

```
frontend/
├── components/agents/
│   ├── ExecutionEstimatesPanel.tsx  [NEW] - Main estimates display component
│   └── TestModePanel.tsx  [UPDATE] - Integrate ExecutionEstimatesPanel
├── types/
│   └── agent.ts  [UPDATE] - Add ExecutionEstimate, EstimateBreakdown interfaces
└── lib/utils/
    └── testEstimatesStorage.ts  [NEW] - localStorage helper for previous estimates
```

---

## References

- [Source: PRD FR39](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/planning-artifacts/prd.md#testing-validation)
- [Source: Epics 2.5](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/planning-artifacts/epics.md#story-25-show-execution-estimates)
- [Source: TestModeService.ts](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/backend/src/services/TestModeService.ts)
- [Source: Story 2-4 Implementation](file:///c:/Users/imkum/SDE/Clianta/mrmorris-build/_bmad-output/implementation-artifacts/2-4-validate-instructions.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro - Code Review Session 2026-01-21

### Debug Log References

### Completion Notes List

- TestModeService already has CREDIT_COSTS and duration tracking per step
- TestRunResult already has totalEstimatedCredits and totalEstimatedDuration fields
- Story builds on existing infrastructure to add UI display and projections
- Key new work: ExecutionEstimatesPanel component and scheduled projection calculations

### File List

- backend/src/services/TestModeService.ts (UPDATE)
- backend/src/services/TestModeService.test.ts (UPDATE)
- frontend/components/agents/ExecutionEstimatesPanel.tsx (NEW)
- frontend/components/agents/TestModePanel.tsx (UPDATE)
- frontend/types/agent.ts (UPDATE)
- frontend/lib/utils/testEstimatesStorage.ts (NEW)
- frontend/package.json (UPDATE) - Added tooltip/icon dependencies
- frontend/package-lock.json (UPDATE) - Lockfile update
