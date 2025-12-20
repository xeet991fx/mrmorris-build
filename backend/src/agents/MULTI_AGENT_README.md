# Multi-Agent Coordination System

## Overview

The enhanced agent system now supports **dynamic multi-agent coordination** where the supervisor can intelligently decide whether to use a single agent or coordinate 2-4 agents working together to handle complex tasks.

## Architecture

### Flow Diagram

```
Simple Task:
Supervisor → Single Worker Agent → Verifier → User

Complex Task:
Supervisor → Planner → Coordinator → Aggregator → Verifier → User
              ↓           ↓
      Complexity     Execute 2-4 Agents
       Analysis      (Parallel/Sequential)
```

### Core Components

1. **Complexity Analyzer** (`complexityAnalyzer.ts`)
   - Analyzes user requests to determine complexity
   - Uses pattern matching + AI analysis
   - Returns confidence score and coordination mode

2. **Execution Planner** (`executionPlanner.ts`)
   - Creates detailed execution plans for multi-agent tasks
   - Predefined plans for common scenarios
   - AI-generated plans for custom scenarios
   - Manages agent dependencies and priorities

3. **Coordinator** (`coordinator.ts`)
   - Executes multiple agents in parallel or sequential mode
   - Manages state sharing between agents
   - Aggregates results using AI
   - Handles errors gracefully

4. **Supervisor V2** (`supervisorV2.ts`)
   - Enhanced supervisor with complexity analysis
   - Routes to planner for complex tasks
   - Routes to single agents for simple tasks
   - Maintains backward compatibility

## Usage

### In Your Code

```typescript
import { invokeAgentV2 } from './agents';

// The system automatically detects complexity
const result = await invokeAgentV2(
  "Prepare me for my meeting with Acme Corp tomorrow",
  workspaceId,
  userId,
  sessionId
);

console.log(result.response);
// Multi-agent coordination happens automatically!
```

### API Integration

Update your routes to use V2:

```typescript
import { invokeAgentV2 } from '../agents';

router.post('/agent/chat', async (req, res) => {
  const { message } = req.body;
  const { workspaceId } = req.params;
  const userId = req.user.id;

  const result = await invokeAgentV2(
    message,
    workspaceId,
    userId,
    req.body.sessionId
  );

  res.json({ success: true, data: result });
});
```

## Complex Task Examples

### 1. Meeting Preparation
**User:** "Prepare for my call with Acme Corp tomorrow"

**What Happens:**
- Complexity analyzer detects: Meeting prep scenario
- Planner creates plan:
  1. Contact agent: Get contact info
  2. Deal agent: Get active deals
  3. Company agent: Get company details
  4. Briefing agent: Generate comprehensive briefing
- Coordinator executes agents in parallel (1-3) then sequential (4)
- Aggregator combines results into unified briefing

**Result:** Comprehensive meeting brief with contact history, deal status, company info, and talking points.

### 2. Campaign Creation
**User:** "Create a nurture campaign for enterprise leads"

**What Happens:**
- Complexity analyzer detects: Campaign creation scenario
- Planner creates plan:
  1. General agent: Research campaign best practices
  2. Company agent: Identify target segments
  3. Competitor agent: Analyze competitive messaging
  4. Campaign agent: Create campaign with workflow
- Coordinator executes sequentially (each uses previous results)
- Aggregator summarizes campaign details

**Result:** Full campaign with research-backed messaging, target list, and automated workflow.

### 3. Deal Analysis
**User:** "Analyze the health of the Acme Corp deal"

**What Happens:**
- Complexity analyzer detects: Deal analysis scenario
- Planner creates plan:
  1. Deal agent: Get deal details
  2. Hygiene agent: Analyze deal health
  3. Forecast agent: Generate revenue forecast
  4. Competitor agent: Provide competitive intel
- Coordinator executes agents in parallel
- Aggregator merges insights

**Result:** Multi-dimensional deal analysis with health score, forecast, and competitive positioning.

### 4. Data Enrichment
**User:** "Find and update information for John Smith at Acme Corp"

**What Happens:**
- Complexity analyzer detects: Data enrichment scenario
- Planner creates plan:
  1. General agent: Web search for information
  2. DataEntry agent: Parse and structure data
  3. Contact agent: Update contact record
  4. Company agent: Update company record
- Coordinator executes sequentially
- Aggregator prioritizes final update confirmation

**Result:** Enriched contact and company records with verified web data.

## Execution Modes

### Parallel Execution
- **When:** Agents have no dependencies on each other
- **Benefits:** Faster execution (simultaneous processing)
- **Example:** Gathering data from multiple sources

### Sequential Execution
- **When:** Agents depend on previous agent results
- **Benefits:** Each agent can use previous results
- **Example:** Research → Analysis → Action

### Mixed Mode (Default)
- **What:** Supervisor decides based on task complexity
- **Logic:**
  - Simple tasks → Single agent
  - Complex, independent → Parallel
  - Complex, dependent → Sequential

## Predefined Plans

The system includes optimized plans for common scenarios:

1. **meeting_prep**: Parallel data gathering + briefing generation
2. **campaign_creation**: Sequential research → planning → execution
3. **deal_analysis**: Parallel multi-dimensional analysis
4. **data_enrichment**: Sequential search → parse → update

## Configuration

### Complexity Thresholds

Edit `complexityAnalyzer.ts` to adjust:
```typescript
// Confidence threshold for multi-agent coordination
if (complexityAnalysis.confidence >= 70) {
  // Use multi-agent
}
```

### Agent Limits

Edit `executionPlanner.ts` to change:
```typescript
// Maximum agents per task (default: 4)
const limitedTasks = optimizedTasks.slice(0, 4);
```

### Timeout

Edit `supervisorV2.ts`:
```typescript
// Default timeout (milliseconds)
timeoutMs: number = 45000 // 45 seconds for multi-agent
```

## Monitoring & Debugging

### Console Output

The system provides detailed logging:

```
🎯 SUPERVISOR - Analyzing request...
🔍 Analyzing task complexity...
✓ COMPLEX TASK detected (245ms)
   Mode: parallel
   Agents: contact, deal, company, briefing

📋 PLANNER - Creating execution plan...
✓ Using predefined plan: meeting_prep (12ms)

🎯 MULTI-AGENT COORDINATION
   Mode: parallel
   Agents: contact, deal, company, briefing
   Strategy: summarize

  🤖 Executing contact agent...
  🤖 Executing deal agent...
  🤖 Executing company agent...
  ✓ contact completed (456ms)
  ✓ deal completed (523ms)
  ✓ company completed (489ms)

  🤖 Executing briefing agent...
  ✓ briefing completed (1243ms)

📊 Aggregating 4 agent results...
✓ Aggregation complete (892ms)

✅ MULTI-AGENT COORDINATION COMPLETE (3245ms)
   Agents executed: 4
   Successful: 4
   Failed: 0
```

### Tool Results

Multi-agent results are stored in `toolResults.multiAgentResults`:

```typescript
{
  toolResults: {
    multiAgentResults: {
      contact: { /* contact agent results */ },
      deal: { /* deal agent results */ },
      company: { /* company agent results */ },
      briefing: { /* briefing results */ }
    },
    executionPlan: {
      mode: 'parallel',
      tasks: [...],
      aggregationStrategy: 'summarize'
    }
  }
}
```

## Backward Compatibility

The original `invokeAgent` function still works:

```typescript
// V1 - Single agent only
import { invokeAgent } from './agents';

// V2 - Multi-agent coordination
import { invokeAgentV2 } from './agents';
```

Both can coexist. Migrate gradually or use V2 everywhere.

## Performance

### Typical Execution Times

- **Simple task (single agent):** 500-2000ms
- **Complex task (2 agents parallel):** 1500-3000ms
- **Complex task (4 agents parallel):** 2000-4000ms
- **Complex task (4 agents sequential):** 4000-8000ms

### Optimization Tips

1. **Use parallel mode** when possible (faster)
2. **Limit agents** to 2-3 for most tasks
3. **Predefined plans** are faster than AI-generated plans
4. **Fast keyword routing** bypasses AI routing

## Troubleshooting

### Issue: All tasks use single agent

**Solution:** Check complexity patterns in `complexityAnalyzer.ts`. Add your use case patterns.

### Issue: Wrong agents selected

**Solution:** Review execution plans in `executionPlanner.ts`. Add predefined plans for common scenarios.

### Issue: Timeout errors

**Solution:** Increase timeout or reduce agent count:
```typescript
await invokeAgentV2(message, workspaceId, userId, sessionId, 60000); // 60s
```

### Issue: Poor result aggregation

**Solution:** Adjust aggregation strategy in your execution plan:
- `merge`: Equal weight to all agents
- `summarize`: Synthesize insights
- `prioritize`: Primary agent + supplements

## Future Enhancements

Potential improvements:

1. **Agent Caching**: Cache repeated data fetches
2. **Streaming Results**: Return partial results as agents complete
3. **User Preferences**: Learn which coordination modes work best
4. **Cost Optimization**: Track token usage, optimize prompts
5. **Agent Specialization**: More specialized coordination patterns

## Migration Guide

### Step 1: Test V2 Alongside V1

```typescript
// Keep V1 for production
const result1 = await invokeAgent(message, ...);

// Test V2 in development
const result2 = await invokeAgentV2(message, ...);
```

### Step 2: Update Routes Gradually

```typescript
// Option A: Feature flag
if (req.query.useV2 === 'true') {
  result = await invokeAgentV2(...);
} else {
  result = await invokeAgent(...);
}

// Option B: Gradual rollout
const useV2 = Math.random() < 0.1; // 10% of requests
result = useV2 ? await invokeAgentV2(...) : await invokeAgent(...);
```

### Step 3: Full Migration

```typescript
// Replace all invokeAgent with invokeAgentV2
import { invokeAgentV2 as invokeAgent } from './agents';
```

## API Reference

### invokeAgentV2

```typescript
async function invokeAgentV2(
  message: string,
  workspaceId: string,
  userId: string,
  sessionId?: string,
  timeoutMs?: number
): Promise<{
  response: string;
  needsInput?: boolean;
  toolResults?: Record<string, any>;
  error?: string;
}>
```

### analyzeTaskComplexity

```typescript
async function analyzeTaskComplexity(
  message: string
): Promise<{
  isComplex: boolean;
  requiresMultipleAgents: boolean;
  suggestedAgents: string[];
  coordinationMode: 'single' | 'parallel' | 'sequential';
  reasoning: string;
  confidence: number;
}>
```

### createExecutionPlan

```typescript
async function createExecutionPlan(
  message: string,
  suggestedAgents: string[],
  coordinationMode: 'parallel' | 'sequential'
): Promise<ExecutionPlan>
```

### executeMultiAgentPlan

```typescript
async function executeMultiAgentPlan(
  state: AgentStateType,
  plan: ExecutionPlan
): Promise<Partial<AgentStateType>>
```

## Examples

See the test file for comprehensive examples:
```bash
npm test -- agents.test.ts
```

## Support

For issues or questions:
1. Check console logs for detailed execution traces
2. Review predefined plans in `executionPlanner.ts`
3. Adjust complexity patterns in `complexityAnalyzer.ts`
4. File an issue with reproduction steps
