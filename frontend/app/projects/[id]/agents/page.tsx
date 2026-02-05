/**
 * ⚠️ LEGACY CODE - ARCHIVED 2026-02-04
 * This page is no longer accessible via navigation.
 * See LEGACY_AGENT_BUILDER.md for recovery instructions.
 *
 * To restore: Uncomment navigation links in dashboard and landing pages
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { CreateAgentModal } from '@/components/agents/CreateAgentModal';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentsEmptyState } from '@/components/agents/AgentsEmptyState';
import { IAgent, ListAgentsParams, ListAgentsResponse } from '@/types/agent';
import { toast } from 'sonner';
import { listAgents } from '@/lib/api/agents';
import { useDebounce } from '@/hooks/useDebounce';

// Story 1.11: Status filter type (includes 'All' for no filter)
type AgentStatusFilter = 'All' | 'Draft' | 'Live' | 'Paused';

// Story 1.11: Sort field options (AC3)
type SortOption = 'createdAt' | 'name' | 'status' | 'lastExecutedAt';

export default function AgentsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  // Data state
  const [agents, setAgents] = useState<IAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Story 1.11: Meta state for status counts (AC4)
  const [meta, setMeta] = useState<ListAgentsResponse['meta'] | null>(null);

  // Story 1.11: Filter/Sort/Search state
  const [statusFilter, setStatusFilter] = useState<AgentStatusFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Story 1.11: Debounce search input (AC5: real-time search as user types)
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Story 1.11: Fetch agents with filters, sorting, search
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

  // Story 1.11 AC6: Navigate to agent detail/edit on card click
  const handleAgentClick = (agentId: string) => {
    router.push(`/projects/${workspaceId}/agents/${agentId}`);
  };

  // Story 1.11: Sort options for dropdown (AC3)
  const sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'status', label: 'Status' },
    { value: 'lastExecutedAt', label: 'Last Execution' }
  ];

  // Story 1.11: Handle sort change
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
              {/* Story 1.11: Show total count from meta (AC1) */}
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
              onChange={(e) => setStatusFilter(e.target.value as AgentStatusFilter)}
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
                    onClick={() => handleAgentClick(agent._id)}  // Story 1.11 AC6: Card click navigation
                    onDuplicate={(newAgent) => {
                      // Add new agent to list and refresh
                      setAgents((prev) => [newAgent, ...prev]);
                    }}
                    onStatusChange={(updatedAgent) => {
                      // Update agent in list with new status
                      setAgents((prev) =>
                        prev.map((a) =>
                          a._id === updatedAgent._id ? updatedAgent : a
                        )
                      );
                    }}
                    onDelete={() => {
                      // Remove deleted agent from list
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
