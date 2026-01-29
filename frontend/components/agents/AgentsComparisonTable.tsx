'use client';

/**
 * Story 3.15 Task 3.3: Agents Comparison Table Component
 *
 * Displays comparison table for all agents in workspace:
 * - Agent name, total executions, success rate, avg duration, last run (AC5)
 * - Sortable by any column (click header to sort)
 * - Filtering options (active, inactive, performance)
 * - Links to agent detail page for drill-down
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  agentStatus: string;
  totalExecutions: number;
  successRate: number;
  avgDurationSeconds: number;
  totalCreditsUsed: number;
  lastRun: string | null;
}

interface AgentsComparisonTableProps {
  agents: AgentMetrics[];
  workspaceId: string;
  onAgentClick?: (agentId: string) => void;
}

type SortField = 'name' | 'executions' | 'successRate' | 'avgDuration' | 'lastRun';

export function AgentsComparisonTable({ agents, workspaceId, onAgentClick }: AgentsComparisonTableProps) {
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'high' | 'needs-attention'>('all');

  // Task 3.3: Handle column sort
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Task 3.4: Filter agents
  const filteredAgents = agents.filter((agent) => {
    // Status filter
    if (statusFilter === 'active' && agent.totalExecutions === 0) return false;
    if (statusFilter === 'inactive' && agent.totalExecutions > 0) return false;

    // Performance filter
    if (performanceFilter === 'high' && agent.successRate < 90) return false;
    if (performanceFilter === 'needs-attention' && agent.successRate >= 80) return false;

    return true;
  });

  // Sort agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = a.agentName.localeCompare(b.agentName);
        break;
      case 'executions':
        compareValue = a.totalExecutions - b.totalExecutions;
        break;
      case 'successRate':
        compareValue = a.successRate - b.successRate;
        break;
      case 'avgDuration':
        compareValue = a.avgDurationSeconds - b.avgDurationSeconds;
        break;
      case 'lastRun':
        const aTime = a.lastRun ? new Date(a.lastRun).getTime() : 0;
        const bTime = b.lastRun ? new Date(b.lastRun).getTime() : 0;
        compareValue = aTime - bTime;
        break;
    }

    return sortOrder === 'desc' ? -compareValue : compareValue;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" />
    );
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (sortedAgents.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        <p>No agents match the current filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task 3.4: Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All</option>
            <option value="active">Active (has executions)</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Performance:</span>
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value as any)}
            className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All</option>
            <option value="high">High Performing (&gt;90%)</option>
            <option value="needs-attention">Needs Attention (&lt;80%)</option>
          </select>
        </div>
      </div>

      {/* Task 3.3: Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                onClick={() => handleSort('name')}
                className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2">
                  Agent Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('executions')}
                className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2">
                  Total Executions
                  <SortIcon field="executions" />
                </div>
              </th>
              <th
                onClick={() => handleSort('successRate')}
                className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2">
                  Success Rate
                  <SortIcon field="successRate" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgDuration')}
                className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2">
                  Avg Duration
                  <SortIcon field="avgDuration" />
                </div>
              </th>
              <th
                onClick={() => handleSort('lastRun')}
                className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2">
                  Last Run
                  <SortIcon field="lastRun" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAgents.map((agent, index) => (
              <motion.tr
                key={agent.agentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onAgentClick && onAgentClick(agent.agentId)}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
              >
                {/* Task 3.5: Link agent name to detail page */}
                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                  {agent.agentName}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {agent.totalExecutions}
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${getSuccessRateColor(agent.successRate)}`}>
                  {agent.totalExecutions > 0 ? `${agent.successRate.toFixed(1)}%` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {agent.totalExecutions > 0 ? `${agent.avgDurationSeconds}s` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {agent.lastRun ? formatDistanceToNow(new Date(agent.lastRun), { addSuffix: true }) : 'Never'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Showing {sortedAgents.length} of {agents.length} agents
      </p>
    </div>
  );
}
