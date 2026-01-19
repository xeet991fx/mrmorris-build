# Story 1.11: List All Workspace Agents

**Epic:** Epic 1 - Manual Agent Building
**Story Key:** 1-11-list-all-workspace-agents
**Status:** complete
**Priority:** High - Completes Epic 1 with polished agents dashboard
**FR Covered:** Agent listing with filtering, sorting, search, and empty state

---

## User Story

**As a** workspace owner,
**I want to** view all agents in my workspace,
**So that** I can see what automation I have configured.

---

## Acceptance Criteria

### AC1: Agents List Display

**Given** I have agents in my workspace
**When** I navigate to the Agents page
**Then** I see a list of all agents with: Name, status badge (Draft/Live/Paused), last execution time, created date

### AC2: Empty State

**Given** I have 0 agents in my workspace
**When** I navigate to the Agents page
**Then** I see an empty state with: "No agents yet" message and "Create Your First Agent" button

### AC3: Default Sorting

**Given** I have multiple agents
**When** I view the list
**Then** Agents are sorted by createdAt (newest first) by default
**And** I can change sorting to: Name (A-Z), Status, Last Execution

### AC4: Status Filtering

**Given** I have agents in different statuses
**When** I view the list
**Then** I can filter by status: All, Draft, Live, Paused
**And** The count of agents in each status is shown

### AC5: Search Functionality

**Given** I have many agents
**When** I search in the search bar
**Then** Agents are filtered by name or goal (case-insensitive)
**And** The list updates in real-time as I type

### AC6: Agent Card Click Navigation

**Given** I view an agent in the list
**When** I click on the agent card
**Then** I am navigated to the agent detail/edit page

### AC7: Quick Action Buttons on Hover

**Given** I hover over an agent card
**When** My cursor is over the card
**Then** I see quick action buttons: Edit, Duplicate, Delete, View Logs

### AC8: Workspace Isolation

**Given** Another user in a different workspace has agents
**When** I view my agents list
**Then** I only see agents from my workspace (workspace isolation verified)

---

## Technical Requirements

### 1. Backend API Enhancement

#### GET `/api/workspaces/:workspaceId/agents`

The existing endpoint needs to be enhanced with query parameters:

**Query Parameters:**
```typescript
interface ListAgentsQuery {
  status?: 'Draft' | 'Live' | 'Paused';  // Filter by status
  sortBy?: 'name' | 'status' | 'createdAt' | 'lastExecutedAt';  // Sort field
  sortOrder?: 'asc' | 'desc';  // Sort direction (default: desc for createdAt)
  search?: string;  // Search in name and goal
  limit?: number;   // Pagination limit (default: 50)
  offset?: number;  // Pagination offset (default: 0)
}
```

**Enhanced Response (200 OK):**
```typescript
{
  success: true;
  agents: IAgent[];
  meta: {
    total: number;           // Total count of agents matching filters
    limit: number;           // Current limit
    offset: number;          // Current offset
    statusCounts: {          // AC4: Status counts for filter UI
      all: number;
      draft: number;
      live: number;
      paused: number;
    }
  }
}
```

### 2. Backend Controller Update

**File:** `backend/src/controllers/agentController.ts`

Update the existing `listAgents` function:

```typescript
/**
 * @route GET /api/workspaces/:workspaceId/agents
 * @desc List all agents in a workspace with filtering, sorting, search, and pagination
 * @access Private (requires authentication and workspace access)
 */
export const listAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      limit = 50,
      offset = 0
    } = req.query;

    // Build filter query with workspace isolation
    const filter: Record<string, any> = { workspace: workspaceId };

    // Status filter (AC4)
    if (status && ['Draft', 'Live', 'Paused'].includes(status as string)) {
      filter.status = status;
    }

    // Search filter (AC5) - case-insensitive search in name and goal
    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { goal: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Build sort object (AC3)
    const sortOptions: Record<string, 1 | -1> = {};
    const sortField = ['name', 'status', 'createdAt', 'lastExecutedAt'].includes(sortBy as string)
      ? sortBy as string
      : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Get total count for pagination
    const total = await Agent.countDocuments(filter);

    // Get status counts for filter UI (AC4)
    const statusCounts = await Agent.aggregate([
      { $match: { workspace: new mongoose.Types.ObjectId(workspaceId as string) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCountsMap = {
      all: 0,
      draft: 0,
      live: 0,
      paused: 0
    };

    statusCounts.forEach(({ _id, count }) => {
      statusCountsMap.all += count;
      if (_id === 'Draft') statusCountsMap.draft = count;
      if (_id === 'Live') statusCountsMap.live = count;
      if (_id === 'Paused') statusCountsMap.paused = count;
    });

    // Query with pagination
    const agents = await Agent.find(filter)
      .sort(sortOptions)
      .skip(Number(offset))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      agents: agents.map(agent => ({
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        lastExecutedAt: agent.lastExecutedAt || null,  // AC1: Show last execution time
        memory: agent.memory || MEMORY_DEFAULTS,
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      })),
      meta: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        statusCounts: statusCountsMap
      }
    });
  } catch (error: any) {
    console.error('Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list agents'
    });
  }
};
```

### 3. Agent Model Update (lastExecutedAt field)

**File:** `backend/src/models/Agent.ts`

Add `lastExecutedAt` field to track last execution time:

```typescript
// Add to IAgent interface
lastExecutedAt?: Date;

// Add to AgentSchema
lastExecutedAt: { type: Date, default: null }

// Add compound index for sorting
AgentSchema.index({ workspace: 1, lastExecutedAt: -1 });
```

### 4. Frontend Types Update

**File:** `frontend/types/agent.ts`

Update and add types:

```typescript
// Add to IAgent interface
export interface IAgent {
  _id: string;
  workspace: string;
  name: string;
  goal: string;
  status: 'Draft' | 'Live' | 'Paused';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string | null;  // Story 1.11: Last execution time
  triggers?: ITrigger[];
  instructions?: string | null;
  restrictions?: IRestrictions;
  memory?: IMemory;
  approvalConfig?: IApprovalConfig;
}

// Story 1.11: List response with meta
export interface ListAgentsResponse {
  success: boolean;
  agents: IAgent[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    statusCounts: {
      all: number;
      draft: number;
      live: number;
      paused: number;
    };
  };
}

// Story 1.11: Query parameters
export interface ListAgentsParams {
  status?: 'Draft' | 'Live' | 'Paused';
  sortBy?: 'name' | 'status' | 'createdAt' | 'lastExecutedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  limit?: number;
  offset?: number;
}
```

### 5. Frontend API Update

**File:** `frontend/lib/api/agents.ts`

Update the list API function:

```typescript
/**
 * List agents with filtering, sorting, search, and pagination (Story 1.11)
 */
export const listAgents = async (
  workspaceId: string,
  params?: ListAgentsParams
): Promise<ListAgentsResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.set('status', params.status);
  if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = `/workspaces/${workspaceId}/agents${queryString ? `?${queryString}` : ''}`;

  const response = await axios.get(url);
  return response.data;
};
```

### 6. Frontend Page Update

**File:** `frontend/app/projects/[id]/agents/page.tsx`

Add filtering, sorting, and search UI:

```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { CreateAgentModal } from '@/components/agents/CreateAgentModal';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentsEmptyState } from '@/components/agents/AgentsEmptyState';
import { IAgent, ListAgentsParams, ListAgentsResponse } from '@/types/agent';
import { toast } from 'sonner';
import { listAgents } from '@/lib/api/agents';
import { useDebounce } from '@/hooks/useDebounce';  // Story 1.11: Debounce hook

type AgentStatus = 'All' | 'Draft' | 'Live' | 'Paused';
type SortOption = 'createdAt' | 'name' | 'status' | 'lastExecutedAt';

export default function AgentsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  // Data state
  const [agents, setAgents] = useState<IAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Meta state for status counts
  const [meta, setMeta] = useState<ListAgentsResponse['meta'] | null>(null);

  // Filter/Sort/Search state (Story 1.11)
  const [statusFilter, setStatusFilter] = useState<AgentStatus>('All');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search input (AC5: real-time search as user types)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);

      const queryParams: ListAgentsParams = {
        sortBy,
        sortOrder,
        limit: 50,
        offset: 0
      };

      // Add status filter (not for 'All')
      if (statusFilter !== 'All') {
        queryParams.status = statusFilter;
      }

      // Add search if present
      if (debouncedSearch.trim()) {
        queryParams.search = debouncedSearch.trim();
      }

      const response = await listAgents(workspaceId, queryParams);
      if (response.success) {
        setAgents(response.agents);
        setMeta(response.meta);
      }
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, statusFilter, sortBy, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // AC6: Navigate to agent detail/edit on card click
  const handleAgentClick = (agentId: string) => {
    router.push(`/projects/${workspaceId}/agents/${agentId}`);
  };

  // Sort options dropdown
  const sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'status', label: 'Status' },
    { value: 'lastExecutedAt', label: 'Last Execution' }
  ];

  // Handle sort change
  const handleSortChange = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      // Toggle order if same sort field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      // Default order: desc for dates, asc for name
      setSortOrder(newSortBy === 'name' ? 'asc' : 'desc');
    }
  };

  if (isLoading && agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading agents...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Agents
              </h1>
              {meta && meta.statusCounts.all > 0 && (
                <span className="px-2.5 py-1 text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  {meta.statusCounts.all}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
              data-testid="add-agent-button"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Add Agent</span>
            </button>
          </motion.div>
        </div>

        {/* Story 1.11: Filter/Sort/Search Bar */}
        <div className="px-4 sm:px-6 lg:px-8 pb-4 flex flex-col sm:flex-row gap-3">
          {/* Search Input (AC5) */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search agents by name or goal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              data-testid="agent-search-input"
            />
          </div>

          {/* Status Filter (AC4) */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AgentStatus)}
              className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              data-testid="status-filter-select"
            >
              <option value="All">All ({meta?.statusCounts.all || 0})</option>
              <option value="Draft">Draft ({meta?.statusCounts.draft || 0})</option>
              <option value="Live">Live ({meta?.statusCounts.live || 0})</option>
              <option value="Paused">Paused ({meta?.statusCounts.paused || 0})</option>
            </select>
          </div>

          {/* Sort Dropdown (AC3) */}
          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="w-4 h-4 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              data-testid="sort-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              data-testid="sort-order-button"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          {agents.length === 0 ? (
            <AgentsEmptyState onCreateClick={() => setIsModalOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <AgentCard
                    agent={agent}
                    workspaceId={workspaceId}
                    onClick={() => handleAgentClick(agent._id)}  // AC6: Card click navigation
                    onDuplicate={(newAgent) => {
                      setAgents((prev) => [newAgent, ...prev]);
                    }}
                    onStatusChange={(updatedAgent) => {
                      setAgents((prev) =>
                        prev.map((a) =>
                          a._id === updatedAgent._id ? updatedAgent : a
                        )
                      );
                    }}
                    onDelete={() => {
                      setAgents((prev) => prev.filter((a) => a._id !== agent._id));
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workspaceId={workspaceId}
      />
    </>
  );
}
```

### 7. AgentCard Update (Last Execution Time & Click Handler)

**File:** `frontend/components/agents/AgentCard.tsx`

Update AgentCard to:
- Display last execution time (AC1)
- Accept onClick prop for navigation (AC6)
- Show quick action buttons on hover (AC7)

```typescript
interface AgentCardProps {
  agent: IAgent;
  workspaceId: string;
  onClick?: () => void;  // Story 1.11: Card click handler
  onDuplicate?: (newAgent: IAgent) => void;
  onStatusChange?: (updatedAgent: IAgent) => void;
  onDelete?: () => void;
}

// In the card component:
// Add last execution time display
{agent.lastExecutedAt && (
  <p className="text-xs text-zinc-400 mt-1">
    Last run: {formatRelativeTime(agent.lastExecutedAt)}
  </p>
)}

// Add onClick handler to card
<div
  onClick={onClick}
  className="cursor-pointer ..."
  data-testid={`agent-card-${agent._id}`}
>
```

### 8. Create useDebounce Hook

**File:** `frontend/hooks/useDebounce.ts` [NEW]

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 9. Create formatRelativeTime Utility

**File:** `frontend/lib/utils/date.ts` [NEW or ADD TO EXISTING]

```typescript
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
```

---

## Architecture Compliance Requirements

### 1. Workspace Isolation

- All queries MUST filter by workspace ID: `{ workspace: workspaceId }`
- Status counts aggregation uses workspaceId filter
- Agent model middleware enforces workspace filter

### 2. Response Pattern

- 200 for successful list with meta
- 500 for server errors
- Consistent response structure with success flag

### 3. Frontend Pattern

- Use existing AgentCard component for consistency
- Debounce search input (300ms) to prevent excessive API calls
- Update local state optimistically for better UX
- Use data-testid attributes for E2E testing

### 4. Performance Considerations

- Default limit of 50 agents per page
- Compound indexes for sorting: `{ workspace: 1, createdAt: -1 }`, `{ workspace: 1, name: 1 }`
- Debounced search to reduce API calls
- Status counts cached with agents query (single API call)

---

## Previous Story Intelligence (Story 1.10)

### Patterns Established:

1. **Backend Controller Pattern:**
   - RBAC check: Workspace creator OR TeamMember with owner/admin role
   - Workspace filter required on all queries
   - Consistent response format with success flag

2. **Frontend Page Pattern:**
   - Use useState for local state management
   - Use useCallback for fetchAgents to prevent stale closures
   - Motion animations for cards
   - Toast notifications for errors

3. **AgentCard Pattern:**
   - Dropdown menu for actions (Edit, Duplicate, Delete)
   - Status badge display
   - Hover effects for quick actions
   - data-testid for testing

4. **Files Modified Pattern:**
   - Backend: agentController.ts (main logic), Agent model (if schema changes)
   - Frontend: types/agent.ts, lib/api/agents.ts, agents/page.tsx, AgentCard.tsx

### Learnings from Previous Stories:

- Always include `data-testid` attributes for E2E testing
- Use consistent error handling with toast.error
- Status badge colors: Draft (gray), Live (green), Paused (yellow)
- All workspace members can view agents list (read permission only)

---

## Developer Guardrails - Critical Patterns

### DO:

1. **Use compound indexes for filtered/sorted queries:**
   ```typescript
   // CORRECT - compound index for workspace + sort field
   AgentSchema.index({ workspace: 1, createdAt: -1 });
   AgentSchema.index({ workspace: 1, name: 1 });
   AgentSchema.index({ workspace: 1, status: 1 });
   ```

2. **Debounce search input:**
   ```typescript
   // CORRECT - 300ms debounce prevents excessive API calls
   const debouncedSearch = useDebounce(searchQuery, 300);
   ```

3. **Include status counts in single API response:**
   ```typescript
   // CORRECT - single aggregation query for counts
   const statusCounts = await Agent.aggregate([
     { $match: { workspace: workspaceId } },
     { $group: { _id: '$status', count: { $sum: 1 } } }
   ]);
   ```

4. **Case-insensitive search:**
   ```typescript
   // CORRECT - use $regex with 'i' option
   filter.$or = [
     { name: { $regex: search.trim(), $options: 'i' } },
     { goal: { $regex: search.trim(), $options: 'i' } }
   ];
   ```

5. **Use useCallback for fetch function:**
   ```typescript
   // CORRECT - prevents stale closures and infinite re-renders
   const fetchAgents = useCallback(async () => {
     // ...
   }, [workspaceId, statusFilter, sortBy, sortOrder, debouncedSearch]);
   ```

### DO NOT:

1. **Don't fetch counts separately:**
   ```typescript
   // WRONG - multiple API calls
   const agents = await Agent.find({ workspace });
   const draftCount = await Agent.countDocuments({ workspace, status: 'Draft' });
   const liveCount = await Agent.countDocuments({ workspace, status: 'Live' });
   ```

2. **Don't forget workspace filter:**
   ```typescript
   // WRONG - no workspace filter
   const agents = await Agent.find({ status: 'Live' });
   ```

3. **Don't search without debounce:**
   ```typescript
   // WRONG - API call on every keystroke
   useEffect(() => {
     fetchAgents(searchQuery);
   }, [searchQuery]);
   ```

4. **Don't hardcode sort order:**
   ```typescript
   // WRONG - no dynamic sort
   const agents = await Agent.find(filter).sort({ createdAt: -1 });
   ```

---

## Implementation Order

1. **Backend Model Update** (Agent.ts)
   - Add lastExecutedAt field
   - Add compound indexes for sort fields

2. **Backend Controller Update** (agentController.ts)
   - Update listAgents with query params
   - Add status counts aggregation
   - Add search filter
   - Add sort options

3. **Frontend Types** (types/agent.ts)
   - Add ListAgentsResponse interface
   - Add ListAgentsParams interface
   - Add lastExecutedAt to IAgent

4. **Frontend Utilities** [NEW]
   - Create useDebounce hook
   - Create formatRelativeTime utility

5. **Frontend API** (lib/api/agents.ts)
   - Update listAgents to accept params
   - Build query string from params

6. **Frontend Page** (agents/page.tsx)
   - Add filter/sort/search state
   - Add filter/sort/search UI controls
   - Update fetchAgents to use params
   - Add card click navigation

7. **Frontend AgentCard** (AgentCard.tsx)
   - Add onClick prop
   - Display lastExecutedAt
   - Enhance hover quick actions

8. **Test & Verify**
   - TypeScript compilation check
   - Test filtering by status
   - Test sorting by all fields
   - Test search (case-insensitive)
   - Test empty state
   - Test workspace isolation
   - Test card click navigation

---

## Testing Requirements

### Backend Tests:

```typescript
describe('List Agents with Filters', () => {
  it('should return all agents sorted by createdAt desc by default', async () => {
    // 200 OK, agents sorted newest first
  });

  it('should filter agents by status', async () => {
    // status=Draft → only Draft agents returned
  });

  it('should search agents by name (case-insensitive)', async () => {
    // search=TEST → matches "test agent", "TEST AGENT", "Test Agent"
  });

  it('should search agents by goal', async () => {
    // search=automation → matches agents with "automation" in goal
  });

  it('should sort agents by name ascending', async () => {
    // sortBy=name&sortOrder=asc → A-Z order
  });

  it('should include status counts in meta', async () => {
    // meta.statusCounts.draft, live, paused populated
  });

  it('should respect pagination limit and offset', async () => {
    // limit=10&offset=5 → skip 5, return 10
  });

  it('should return empty array for workspace with no agents', async () => {
    // success: true, agents: [], meta.total: 0
  });

  it('should not return agents from other workspaces', async () => {
    // Workspace isolation verified
  });
});
```

### Frontend Tests:

```typescript
describe('AgentsPage', () => {
  it('should display agents grid on load', () => {
    // Grid with AgentCards visible
  });

  it('should show empty state when no agents', () => {
    // "No agents yet" message and CTA button
  });

  it('should filter agents by status', () => {
    // Select "Live" → only Live agents shown
  });

  it('should search agents as user types (debounced)', () => {
    // Type "test" → after 300ms, filtered results
  });

  it('should sort agents by selected field', () => {
    // Select "Name (A-Z)" → agents sorted alphabetically
  });

  it('should toggle sort order', () => {
    // Click ↓ button → becomes ↑, sort reversed
  });

  it('should navigate to agent detail on card click', () => {
    // Click card → router.push to /projects/:id/agents/:agentId
  });

  it('should show status counts in filter dropdown', () => {
    // "All (10)", "Draft (5)", "Live (3)", "Paused (2)"
  });

  it('should show last execution time on card', () => {
    // "Last run: 2h ago" displayed
  });
});
```

---

## File List (Expected Changes)

### Backend:

- `backend/src/models/Agent.ts` - Add lastExecutedAt field and indexes
- `backend/src/controllers/agentController.ts` - Update listAgents with filters/sort/search

### Frontend:

- `frontend/types/agent.ts` - Add ListAgentsResponse, ListAgentsParams, lastExecutedAt
- `frontend/lib/api/agents.ts` - Update listAgents to accept params
- `frontend/hooks/useDebounce.ts` [NEW] - Debounce hook
- `frontend/lib/utils/date.ts` [NEW or UPDATE] - formatRelativeTime utility
- `frontend/app/projects/[id]/agents/page.tsx` - Add filter/sort/search UI
- `frontend/components/agents/AgentCard.tsx` - Add onClick, lastExecutedAt display

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Implementation completed without blocking issues.

### Completion Notes List

1. Backend model updated with `lastExecutedAt` field and compound indexes for sorting
2. Backend controller enhanced with filtering (status), sorting (4 fields), search (name/goal), and pagination
3. Frontend types updated with `ListAgentsParams`, enhanced `ListAgentsResponse` with meta
4. `useDebounce` hook already existed - reused
5. Created `formatRelativeTime` utility for relative time display
6. Frontend API function updated to accept query parameters
7. Agents page updated with search bar, status filter dropdown, sort dropdown with order toggle
8. AgentCard updated with optional `onClick` prop and `lastExecutedAt` display
9. Fixed pre-existing type issues in PipelineForm and theme-provider during build verification

### File List

**Backend:**
- `backend/src/models/Agent.ts` - Added lastExecutedAt field and indexes
- `backend/src/controllers/agentController.ts` - Enhanced listAgents with filters/sort/search/pagination

**Frontend:**
- `frontend/types/agent.ts` - Added ListAgentsParams, updated ListAgentsResponse, added lastExecutedAt to IAgent
- `frontend/lib/utils/date.ts` [NEW] - Created formatRelativeTime utility
- `frontend/lib/api/agents.ts` - Updated listAgents to accept params
- `frontend/app/projects/[id]/agents/page.tsx` - Added filter/sort/search UI
- `frontend/components/agents/AgentCard.tsx` - Added onClick prop and lastExecutedAt display

**Pre-existing fixes (not Story 1.11):**
- `frontend/components/pipelines/PipelineForm.tsx` - Fixed type compatibility
- `frontend/components/providers/theme-provider.tsx` - Fixed import path

---

## References

- [Source: _bmad-output/planning-artifacts/epics/epic-01-manual-agent-building.md#Story 1.11]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Routes]
- [Source: backend/src/controllers/agentController.ts - existing listAgents pattern]
- [Source: frontend/app/projects/[id]/agents/page.tsx - current implementation]
- [Source: _bmad-output/implementation-artifacts/1-10-delete-agent.md - previous story patterns]
