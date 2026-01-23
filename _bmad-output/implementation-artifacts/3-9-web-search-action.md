# Story 3.9: Web Search Action

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a workspace owner,
I want agents to perform web searches,
So that they can research companies and contacts before outreach.

## Acceptance Criteria

1. **AC1: Variable Resolution in Search Query**
   - Given agent instruction: "Search web for recent news about @company.name"
   - When action executes for Acme Corp
   - Then web search query is: "recent news about Acme Corp"
   - And search is performed using web search API
   - And top 3-5 results are returned with titles, snippets, URLs

2. **AC2: Store Results in Execution Context**
   - Given search results are returned
   - When action completes
   - Then results are stored in execution context
   - And results are available to next steps via @search.results
   - And agent can reference findings in email: "I saw @search.results[0].title"

3. **AC3: Handle Complex Search Queries**
   - Given agent searches for company funding
   - When instruction: "Search: Has @company.name raised funding recently?"
   - Then query becomes: "Has Acme Corp raised funding recently?"
   - And results include relevant articles about Series B, acquisitions, etc.

4. **AC4: Handle Empty Results Gracefully**
   - Given web search returns no results
   - When query yields 0 results
   - Then action completes with empty results array
   - And execution continues (doesn't fail)
   - And agent can handle: "If search found nothing, skip email"

5. **AC5: Retry with Exponential Backoff on Rate Limit**
   - Given web search API rate limit is hit
   - When API returns rate limit error
   - Then action retries with exponential backoff (3 attempts: 1s, 2s, 4s)
   - And if all attempts fail, execution fails with error: "Web search unavailable"

6. **AC6: Handle Search Timeout**
   - Given web search takes too long
   - When search exceeds 10 seconds
   - Then search times out
   - And action fails with error: "Web search timed out"
   - And empty results are returned

7. **AC7: Sanitize Query with Special Characters**
   - Given search query contains special characters
   - When instruction: "Search for @company.name's CEO profile"
   - Then query is sanitized for safe search
   - And special characters are escaped or removed

## Tasks / Subtasks

- [x] **Task 1: Create WebSearchService Utility (AC: 1, 5, 6, 7)**
  - [x] 1.1 Create `backend/src/utils/WebSearchService.ts` (pattern: follow GmailService.ts)
  - [x] 1.2 Add Google Custom Search API configuration (env vars: `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`)
  - [x] 1.3 Implement `search(query: string, options?: SearchOptions)` method
  - [x] 1.4 Implement query sanitization for special characters (AC7)
  - [x] 1.5 Add 10-second timeout (AbortController or axios timeout) (AC6)
  - [x] 1.6 Implement exponential backoff retry logic (3 attempts: 1s, 2s, 4s) (AC5)
  - [x] 1.7 Return structured results: `{ title: string, snippet: string, url: string }[]`

- [x] **Task 2: Update executeWebSearch in ActionExecutorService (AC: 1, 2, 3, 4)**
  - [x] 2.1 Replace placeholder stub with full implementation
  - [x] 2.2 Extract query from action.query or action.params.query
  - [x] 2.3 Apply variable resolution using existing `resolveEmailVariables` function (AC1)
  - [x] 2.4 Call WebSearchService.search() with resolved query
  - [x] 2.5 Store results in `context.variables['search'] = { results: [...] }` (AC2)
  - [x] 2.6 Handle empty results array gracefully (AC4)
  - [x] 2.7 Return structured ActionResult with success, description, data

- [x] **Task 3: Variable Resolution for Search Results (AC: 2)**
  - [x] 3.1 Extend `resolveEmailVariables` to handle @search.results[N].field pattern
  - [x] 3.2 Support @search.results[0].title, @search.results[0].snippet, @search.results[0].url
  - [x] 3.3 Handle out-of-bounds access gracefully (return empty string)
  - [x] 3.4 Support @search.results.length for conditional logic

- [x] **Task 4: AI Credit Tracking for Searches (AC: All)**
  - [x] 4.1 Add 'web_search' to AI credit consumption tracking (already exists in AgentExecutionService CREDIT_COSTS)
  - [x] 4.2 Cost: 1 AI credit per search (per PRD spec) - configured in CREDIT_COSTS
  - [x] 4.3 Track search count in execution metadata (handled by getCreditCost function)
  - [x] 4.4 Include credit cost in ActionResult.data (handled by AgentExecutionService)

- [x] **Task 5: Error Handling and Edge Cases (AC: 4, 5, 6)**
  - [x] 5.1 Handle API key missing/invalid error (WebSearchService returns descriptive error)
  - [x] 5.2 Handle network timeout with clear error message (AC6 - "Web search timed out")
  - [x] 5.3 Handle rate limit exceeded with retry exhaustion message (AC5 - "Web search unavailable")
  - [x] 5.4 Handle malformed API responses gracefully (missing fields default to empty strings)
  - [x] 5.5 Log all search attempts for debugging (console.log in retry loop)

- [x] **Task 6: Unit and Integration Tests (AC: All)**
  - [x] 6.1 Unit test: WebSearchService.search() with mocked API
  - [x] 6.2 Unit test: Query sanitization (special characters, quotes, etc.)
  - [x] 6.3 Unit test: Variable resolution in search queries
  - [x] 6.4 Unit test: Retry logic on 429 error
  - [x] 6.5 Unit test: 10-second timeout handling
  - [x] 6.6 Unit test: Empty results handling
  - [x] 6.7 Unit test: @search.results[N].field resolution
  - [x] 6.8 Integration test: Full web_search action flow in ActionExecutorService

## Dev Notes

### Current Implementation Gap Analysis

| Aspect | Current State | Required State (3.9) |
|--------|---------------|----------------------|
| WebSearchService | Not implemented | New WebSearchService.ts utility |
| executeWebSearch | **STUB** (lines 669-709) - returns placeholder | Full implementation with Google API |
| Variable Resolution | Exists for @contact, @company, @deal | Add @search.results[N].field |
| Retry Logic | Pattern exists in GmailService | Apply same pattern |
| Timeout | Not implemented | 10-second timeout required |

### Architecture Pattern: Web Search Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    executeWebSearch Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Extract Query                                                │
│     │                                                            │
│     ├── Get action.query or action.params.query                 │
│     │                                                            │
│     └── If empty → Return error: "No query specified"           │
│                                                                  │
│  2. Variable Resolution                                          │
│     │                                                            │
│     ├── Replace @contact.* with context.contact values          │
│     ├── Replace @company.* with context.contact.company values  │
│     └── Replace {{var}} style variables                         │
│                                                                  │
│  3. Query Sanitization                                           │
│     │                                                            │
│     ├── Escape special characters (' " \ etc.)                  │
│     └── Trim and limit query length (max 256 chars)             │
│                                                                  │
│  4. Execute Search with Retry                                    │
│     │                                                            │
│     ├── Call Google Custom Search API                            │
│     ├── Timeout: 10 seconds                                      │
│     ├── On 429 → Retry with exponential backoff (1s, 2s, 4s)    │
│     └── Max 3 retries before failing                             │
│                                                                  │
│  5. Store Results in Context                                     │
│     │                                                            │
│     ├── context.variables['search'] = {                          │
│     │     results: [{ title, snippet, url }, ...],              │
│     │     query: resolvedQuery,                                  │
│     │     count: results.length                                  │
│     │   }                                                        │
│     │                                                            │
│     └── Results available for subsequent steps                   │
│                                                                  │
│  6. Return ActionResult                                          │
│     │                                                            │
│     ├── success: true/false                                      │
│     ├── description: "Found X results for: query"               │
│     ├── data: { query, results, count, durationMs }             │
│     └── durationMs: execution time                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Google Custom Search API Implementation

```typescript
// WebSearchService.ts - Core implementation pattern

import axios from 'axios';

// Environment variables required
// GOOGLE_SEARCH_API_KEY - API key from Google Cloud Console
// GOOGLE_SEARCH_ENGINE_ID - Custom Search Engine ID (cx parameter)

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface WebSearchResult {
  success: boolean;
  results: SearchResult[];
  error?: string;
  retryAttempts?: number;
  durationMs?: number;
}

const GOOGLE_SEARCH_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';
const SEARCH_TIMEOUT_MS = 10000; // 10 seconds (NFR55)
const MAX_RESULTS = 5; // Top 3-5 results per AC1

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Sanitize search query for safe API call
 */
function sanitizeQuery(query: string): string {
  // Remove or escape special characters that could cause issues
  return query
    .replace(/['"\\]/g, ' ')  // Remove quotes and backslashes
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim()
    .substring(0, 256);       // Limit query length
}

/**
 * Execute web search with retry logic
 */
async function search(
  query: string,
  options: { maxResults?: number } = {}
): Promise<WebSearchResult> {
  const startTime = Date.now();
  const maxResults = options.maxResults || MAX_RESULTS;

  // Validate environment configuration
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return {
      success: false,
      results: [],
      error: 'Web search not configured. Missing API key or search engine ID.',
    };
  }

  const sanitizedQuery = sanitizeQuery(query);
  let lastError: Error | null = null;
  let delayMs = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.get(GOOGLE_SEARCH_ENDPOINT, {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: sanitizedQuery,
          num: maxResults,
        },
        timeout: SEARCH_TIMEOUT_MS,
      });

      // Parse results
      const items = response.data.items || [];
      const results: SearchResult[] = items.map((item: any) => ({
        title: item.title || '',
        snippet: item.snippet || '',
        url: item.link || '',
      }));

      return {
        success: true,
        results,
        retryAttempts: attempt - 1,
        durationMs: Date.now() - startTime,
      };

    } catch (error: any) {
      lastError = error;

      // Check for timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return {
          success: false,
          results: [],
          error: 'Web search timed out (exceeded 10 seconds)',
          durationMs: Date.now() - startTime,
        };
      }

      // Check for rate limit (429)
      if (error.response?.status === 429) {
        if (attempt < RETRY_CONFIG.maxRetries) {
          console.log(`Search API rate limit hit. Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= RETRY_CONFIG.backoffMultiplier;
          continue;
        }
        return {
          success: false,
          results: [],
          error: 'Web search unavailable (rate limit exceeded after retries)',
          retryAttempts: attempt,
          durationMs: Date.now() - startTime,
        };
      }

      // Other errors - don't retry
      return {
        success: false,
        results: [],
        error: error.response?.data?.error?.message || error.message,
        retryAttempts: attempt - 1,
        durationMs: Date.now() - startTime,
      };
    }
  }

  return {
    success: false,
    results: [],
    error: lastError?.message || 'Web search failed',
    retryAttempts: RETRY_CONFIG.maxRetries,
    durationMs: Date.now() - startTime,
  };
}
```

### Variable Resolution Extension for @search.results

```typescript
// Add to resolveEmailVariables function in ActionExecutorService.ts

// Replace @search.results[N].field patterns
content = content.replace(/@search\.results\[(\d+)\]\.(\w+)/g, (match, index, field) => {
  const results = context.variables?.search?.results;
  if (!Array.isArray(results)) return match;

  const idx = parseInt(index, 10);
  if (idx >= results.length) return ''; // Out of bounds - return empty

  const value = results[idx]?.[field];
  return value !== undefined && value !== null ? String(value) : match;
});

// Replace @search.results.length
content = content.replace(/@search\.results\.length/g, () => {
  const results = context.variables?.search?.results;
  return Array.isArray(results) ? String(results.length) : '0';
});
```

### Key Files to Create/Modify

| Purpose | File Path | Action |
|---------|-----------|--------|
| Web Search Service | `backend/src/utils/WebSearchService.ts` | **Create** - API calls, retry logic, timeout |
| Web Search Tests | `backend/src/utils/WebSearchService.test.ts` | **Create** - Unit tests |
| Action Executor | `backend/src/services/ActionExecutorService.ts` | **Modify** - Replace stub with full implementation |
| Action Executor Tests | `backend/src/services/ActionExecutorService.test.ts` | **Modify** - Add web_search tests |

### Key Files to Reference

| Purpose | File Path | Why |
|---------|-----------|-----|
| Gmail Service Pattern | `backend/src/utils/GmailService.ts` | **Follow this pattern exactly** for WebSearchService |
| Gmail Tests Pattern | `backend/src/utils/GmailService.test.ts` | Test structure to follow |
| LinkedIn Service | `backend/src/utils/LinkedInService.ts` | Additional API service pattern |
| Action Executor | `backend/src/services/ActionExecutorService.ts:669-709` | **REPLACE THIS STUB** |
| Variable Resolution | `backend/src/services/ActionExecutorService.ts:200-236` | Extend for @search.results |
| Previous Story | `_bmad-output/implementation-artifacts/3-8-linkedin-invitation-action.md` | Patterns and learnings |

### Project Structure Notes

- Create `backend/src/utils/WebSearchService.ts` following GmailService.ts structure
- Tests go in same directory: `WebSearchService.test.ts`
- Environment variables required: `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`
- No new models needed - results stored in execution context

### Critical Implementation Notes from Previous Stories

**From Story 3.8 (LinkedIn Invitation Action) - CRITICAL:**
- Created `LinkedInService.ts` utility - **follow this exact pattern**
- Used axios for API calls with proper error handling
- Implemented exponential backoff: 1s, 2s, 4s for 3 retries
- All tests follow same structure: unit tests for service, integration tests for action
- Return structured results with success, description, error, data, durationMs fields

**From Story 3.7 (Send Email Action):**
- GmailService.ts is the canonical pattern for external API services
- Token/credential handling patterns established
- Rate limit handling with user-friendly error messages
- Activity logging pattern (may not apply to web search)

**From Story 3.6 (Conditional Logic):**
- Use explicit typing for all new interfaces
- Context variables are used for cross-step data sharing
- Return structured results with success, description, error, data fields
- Include durationMs in all results for performance tracking

**From Story 3.1 (Parse and Execute):**
- ActionExecutorService pattern is established - extend, don't replace
- Error messages should be user-friendly and actionable
- Placeholder implementations exist - this story completes web_search

### Google Custom Search API Considerations

**API Access Notes:**
- Requires Google Cloud Console project with Custom Search API enabled
- Custom Search Engine must be configured (search entire web or specific sites)
- Free tier: 100 queries/day, paid: $5 per 1000 queries
- Response includes: title, snippet, link, displayLink, formattedUrl

**Rate Limits:**
- 100 queries per day (free tier)
- Higher limits available with billing enabled
- Rate limit error returns HTTP 429

**Query Limits:**
- Maximum query length: ~2048 characters (safe limit: 256)
- Special characters should be URL-encoded
- Boolean operators supported: AND, OR, NOT

### Error Messages

| Scenario | Error Message |
|----------|---------------|
| No query specified | "Web search failed: no query specified" |
| API not configured | "Web search not configured. Missing API key or search engine ID." |
| Timeout | "Web search timed out (exceeded 10 seconds)" |
| Rate limit exceeded | "Web search unavailable (rate limit exceeded after retries)" |
| Empty results | No error - returns empty array with success: true |
| Invalid API key | "Web search failed: Invalid API key" |

### NFR Compliance

- **NFR1:** Target 80% executions under 30s - web search adds ~2-5s latency
- **NFR35:** 90% success rate - Retry logic handles transient failures
- **NFR55:** 90% of searches complete in <5s - 10s timeout is safety buffer
- **NFR84:** Actions logged in AgentExecution for 30-day retention

### Similarity to Story 3.7/3.8 Checklist

| Component | 3.7 (Gmail) | 3.8 (LinkedIn) | 3.9 (Web Search) |
|-----------|-------------|----------------|------------------|
| Service File | GmailService.ts | LinkedInService.ts | WebSearchService.ts |
| External API | Gmail API | LinkedIn API | Google Custom Search API |
| Rate Limit | 100 emails/day | 100 invites/day | 100 queries/day (free) |
| Timeout | N/A | N/A | **10 seconds** (AC6) |
| Retry Logic | 3 attempts | 3 attempts | 3 attempts |
| Context Storage | N/A | N/A | **@search.results** (AC2) |
| Activity Logging | Yes | Yes | No (informational action) |
| AI Credits | N/A | N/A | **1 credit/search** |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.9] - Full acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Agent Execution] - Execution patterns
- [Source: _bmad-output/planning-artifacts/prd.md#FR31] - Web Search is one of 8 core actions
- [Source: backend/src/utils/GmailService.ts] - Pattern to follow for WebSearchService
- [Source: backend/src/utils/LinkedInService.ts] - Additional API service pattern
- [Source: backend/src/services/ActionExecutorService.ts:669-709] - **STUB TO REPLACE**
- [Source: backend/src/services/ActionExecutorService.ts:200-236] - Variable resolution to extend
- [Source: _bmad-output/implementation-artifacts/3-8-linkedin-invitation-action.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-thinking (Amelia - Dev Agent)

### Debug Log References

- WebSearchService tests: 26/26 passed
- ActionExecutorService web_search tests: 12/12 passed
- Total tests added: 38 new tests for Story 3.9

### Completion Notes List

1. **Task 1 Complete**: Created WebSearchService.ts following GmailService.ts pattern exactly. Implements Google Custom Search API with 10-second timeout (AC6), exponential backoff retry (AC5), and query sanitization (AC7).

2. **Task 2 Complete**: Replaced executeWebSearch stub in ActionExecutorService.ts with full implementation. Variable resolution via resolveEmailVariables (AC1), stores results in context.variables['search'] (AC2), handles empty results gracefully (AC4).

3. **Task 3 Complete**: Extended resolveEmailVariables to support @search.results[N].field, @search.results.length, @search.count, and @search.query patterns. Out-of-bounds access returns empty string.

4. **Task 4 Complete**: AI credit tracking already configured - 'web_search' has 1 credit cost in CREDIT_COSTS constant (line 118 of AgentExecutionService.ts).

5. **Task 5 Complete**: Comprehensive error handling implemented - API config errors, timeout, rate limit exhaustion, malformed responses all handled with clear user-friendly messages.

6. **Task 6 Complete**: 26 unit tests for WebSearchService + 12 integration tests for ActionExecutorService web_search action. All tests passing.

### File List

**Created:**
- backend/src/utils/WebSearchService.ts - Google Custom Search API service
- backend/src/utils/WebSearchService.test.ts - 27 unit tests (added URL preservation test)

**Modified:**
- backend/src/services/ActionExecutorService.ts - Added WebSearchService import, replaced executeWebSearch stub, extended resolveEmailVariables for @search.results, added whitespace query validation
- backend/src/services/ActionExecutorService.test.ts - Fixed LinkedInService mock path and methods, added WebSearchService mock, 13 web_search tests (added whitespace test), 3 variable resolution tests

### Senior Developer Review (AI)

**Review Date:** 2026-01-24
**Reviewer:** Code Review Workflow

**Issues Found & Fixed:**

1. **[HIGH] LinkedInService Mock Path Mismatch** - Fixed mock path from `./LinkedInService` to `../utils/LinkedInService` to match actual import

2. **[HIGH] Incomplete LinkedInService Mock** - Added missing `sendInvitationWithWorkspaceAccount` and `checkDailyLimit` methods to mock

3. **[MEDIUM] Query Sanitization Removed Forward Slashes** - Modified `sanitizeQuery` to preserve forward slashes, allowing URL-containing searches

4. **[MEDIUM] Awkward Spacing After Apostrophe Removal** - Changed apostrophe handling to remove without adding space ("Corp's" → "Corps" instead of "Corp s")

5. **[MEDIUM] No Whitespace Query Validation** - Added validation to reject whitespace-only queries after variable resolution

**Tests Added:**
- `should preserve forward slashes for URLs` - WebSearchService sanitizeQuery
- `should fail when query is whitespace only` - ActionExecutorService web_search

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-23 | Dev Agent | Initial implementation of Story 3.9 |
| 2026-01-24 | Code Review | Fixed 5 issues (2 HIGH, 3 MEDIUM), added 2 tests |

