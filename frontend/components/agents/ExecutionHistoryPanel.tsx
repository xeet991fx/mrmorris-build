'use client';

/**
 * Story 3.13: Execution History Panel Component
 *
 * Displays execution history for an agent with:
 * - List of all executions (AC1: executionId, status, timestamps, triggeredBy, summary)
 * - Filtering by status (completed, failed, cancelled)
 * - Pagination support
 * - Role-based data display (AC6: owners see full data, members see redacted)
 * - Detailed execution view with step-by-step breakdown
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  StopCircleIcon,
  PlayCircleIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import {
  listAgentExecutions,
  getAgentExecution,
  retryAgentExecution,
  exportAgentExecutions,
  type Execution,
  type ExecutionStep,
  type ExecutionSummary
} from '@/lib/api/agents';
import { getErrorSuggestion } from '@/utils/errorSuggestions';
import { useAgentExecution } from '@/hooks/useAgentExecution';
import { EmailExecutionProgress } from './EmailExecutionProgress';

interface ExecutionHistoryPanelProps {
  workspaceId: string;
  agentId: string;
}

export function ExecutionHistoryPanel({ workspaceId, agentId }: ExecutionHistoryPanelProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = useState<Record<string, Execution>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [limit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [retryingExecution, setRetryingExecution] = useState<string | null>(null);
  const [liveExecutions, setLiveExecutions] = useState<Record<string, { step: number; total: number; action: string; progress?: number }>>({});
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Story 3.14 AC8: Real-time Socket.io updates for execution progress
  useAgentExecution({
    workspaceId,
    agentId,
    onStarted: (event) => {
      // Refresh list to show new execution
      fetchExecutions();
    },
    onProgress: (event) => {
      // Update live execution progress
      setLiveExecutions((prev) => ({
        ...prev,
        [event.executionId]: {
          step: event.step,
          total: event.total,
          action: event.action,
          progress: event.progress,
        },
      }));

      // If execution details are open, refresh them
      if (selectedExecution === event.executionId) {
        fetchExecutionDetails(event.executionId);
      }
    },
    onCompleted: (event) => {
      // Remove from live executions
      setLiveExecutions((prev) => {
        const updated = { ...prev };
        delete updated[event.executionId];
        return updated;
      });

      // Refresh list to update status
      fetchExecutions();

      // If execution details are open, refresh them
      if (selectedExecution === event.executionId) {
        fetchExecutionDetails(event.executionId);
      }
    },
    onFailed: (event) => {
      // Remove from live executions
      setLiveExecutions((prev) => {
        const updated = { ...prev };
        delete updated[event.executionId];
        return updated;
      });

      // Refresh list to update status
      fetchExecutions();

      // If execution details are open, refresh them
      if (selectedExecution === event.executionId) {
        fetchExecutionDetails(event.executionId);
      }
    },
  });

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setSkip(0); // Reset pagination on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchExecutions();
  }, [workspaceId, agentId, statusFilter, dateRangeFilter, debouncedSearch, skip]);

  const fetchExecutions = async () => {
    try {
      setIsLoading(true);

      const params: {
        status?: string;
        limit: number;
        skip: number;
        startDate?: string;
        endDate?: string;
        search?: string;
      } = {
        limit,
        skip,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Calculate date range based on filter selection
      if (dateRangeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (dateRangeFilter) {
          case 'last24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'last7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = now;
        }

        params.startDate = startDate.toISOString();
        params.endDate = now.toISOString();
      }

      // Story 3.14 AC4: Search functionality
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const response = await listAgentExecutions(workspaceId, agentId, params);

      if (response.success) {
        setExecutions(response.executions || []);
        setTotalCount(response.count || response.executions?.length || 0);
      }
    } catch (error: any) {
      console.error('Error fetching executions:', error);
      toast.error(error.response?.data?.error || 'Failed to load execution history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExecutionDetails = async (executionId: string) => {
    if (executionDetails[executionId]) {
      // Already loaded
      return;
    }

    try {
      const response = await getAgentExecution(workspaceId, agentId, executionId);

      if (response.success) {
        setExecutionDetails((prev) => ({
          ...prev,
          [executionId]: response.execution,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching execution details:', error);
      toast.error(error.response?.data?.error || 'Failed to load execution details');
    }
  };

  const handleToggleDetails = async (executionId: string) => {
    if (selectedExecution === executionId) {
      setSelectedExecution(null);
    } else {
      setSelectedExecution(executionId);
      await fetchExecutionDetails(executionId);
    }
  };

  const handleRetryExecution = async (executionId: string) => {
    try {
      setRetryingExecution(executionId);
      const response = await retryAgentExecution(workspaceId, agentId, executionId);

      if (response.success) {
        toast.success(`Execution retry started: ${response.executionId.slice(0, 12)}...`, {
          description: response.message,
        });
        // Refresh executions list to show the new execution
        await fetchExecutions();
      }
    } catch (error: any) {
      console.error('Error retrying execution:', error);
      toast.error(error.response?.data?.error || 'Failed to retry execution');
    } finally {
      setRetryingExecution(null);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);

      // Build export params with current filters
      const params: any = {
        format,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Calculate date range based on filter selection
      if (dateRangeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (dateRangeFilter) {
          case 'last24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'last7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = now;
        }

        params.startDate = startDate.toISOString();
        params.endDate = now.toISOString();
      }

      // Call export API
      const blob = await exportAgentExecutions(workspaceId, agentId, params);

      // Trigger file download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `executions-${agentId}-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Executions exported as ${format.toUpperCase()}`, {
        description: `Downloaded ${totalCount} execution${totalCount !== 1 ? 's' : ''}`,
      });

      setShowExportDialog(false);
    } catch (error: any) {
      console.error('Error exporting executions:', error);
      toast.error(error.response?.data?.error || 'Failed to export executions');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <StopCircleIcon className="w-5 h-5 text-yellow-500" />;
      case 'running':
        return <PlayCircleIcon className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'waiting':
        return <ClockIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full';
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`;
      case 'failed':
        return `${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`;
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`;
      case 'running':
        return `${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`;
      case 'waiting':
        return `${baseClasses} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400`;
      default:
        return `${baseClasses} bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400`;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (isLoading && executions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading execution history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Execution History
          {debouncedSearch && (
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              ({totalCount} result{totalCount !== 1 ? 's' : ''} for "{debouncedSearch}")
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* Search Input (AC4) */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search executions..."
            className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />

          {/* Date Range Filter (AC3) */}
          <select
            value={dateRangeFilter}
            onChange={(e) => {
              setDateRangeFilter(e.target.value);
              setSkip(0);
            }}
            className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="last24h">Last 24 Hours</option>
            <option value="last7d">Last 7 Days</option>
            <option value="last30d">Last 30 Days</option>
          </select>

          {/* Status Filter (AC2) */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setSkip(0);
            }}
            className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="running">Running</option>
            <option value="waiting">Waiting</option>
          </select>

          {/* Clear Filters Button (AC3, AC4) */}
          {(dateRangeFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setDateRangeFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
                setSkip(0);
              }}
              className="px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              Clear
            </button>
          )}

          {/* Export Button (AC10) */}
          <button
            onClick={() => setShowExportDialog(true)}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Executions List */}
      {executions.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No execution history yet</p>
          <p className="text-xs mt-1">Run your agent to see execution logs here</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {executions.map((execution) => {
              const isExpanded = selectedExecution === execution.executionId;
              const details = executionDetails[execution.executionId];
              const liveProgress = liveExecutions[execution.executionId];

              return (
                <motion.div
                  key={execution.executionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900"
                >
                  {/* Execution Summary */}
                  <button
                    onClick={() => handleToggleDetails(execution.executionId)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    )}

                    <div className="flex-shrink-0">{getStatusIcon(execution.status)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                          {execution.executionId.slice(0, 12)}...
                        </span>
                        <span className={getStatusBadge(execution.status)}>
                          {execution.status}
                        </span>
                      </div>
                      {/* Story 3.13 AC2: Display human-readable summary */}
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">
                        {execution.summary.description || `${execution.summary.successfulSteps}/${execution.summary.totalSteps} steps completed`}
                      </p>

                      {/* Story 3.14 AC8: Live progress indicator for running executions */}
                      {liveProgress && execution.status === 'running' && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Step {liveProgress.step}/{liveProgress.total}: {liveProgress.action}
                            {liveProgress.progress !== undefined && ` (${liveProgress.progress}%)`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}</span>
                        <span>•</span>
                        <span>{formatDuration(execution.duration)}</span>
                        <span>•</span>
                        <span>{execution.summary.totalCreditsUsed} credits</span>
                        {execution.triggeredBy && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              Manual
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Execution Details (Expanded) */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className="px-4 py-3 space-y-3">
                        {/* Metadata */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="grid grid-cols-2 gap-4 text-xs flex-1">
                            <div>
                              <span className="text-zinc-500 dark:text-zinc-400">Started:</span>
                              <p className="text-zinc-900 dark:text-zinc-100 font-mono">
                                {format(new Date(execution.startedAt), 'MMM d, yyyy HH:mm:ss')}
                              </p>
                            </div>
                            {execution.completedAt && (
                              <div>
                                <span className="text-zinc-500 dark:text-zinc-400">Completed:</span>
                                <p className="text-zinc-900 dark:text-zinc-100 font-mono">
                                  {format(new Date(execution.completedAt), 'MMM d, yyyy HH:mm:ss')}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Story 3.14 AC9: Retry button for failed executions */}
                          {execution.status === 'failed' && (
                            <button
                              onClick={() => handleRetryExecution(execution.executionId)}
                              disabled={retryingExecution === execution.executionId}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              {retryingExecution === execution.executionId ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Retrying...
                                </>
                              ) : (
                                <>
                                  <PlayCircleIcon className="w-3.5 h-3.5" />
                                  Retry
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Story 5.4 Task 9: Email Execution Progress (AC3, AC5, AC6) */}
                        <EmailExecutionProgress
                          execution={details || execution}
                          liveProgress={liveProgress}
                          isExpanded={isExpanded}
                        />

                        {/* Steps */}
                        {details?.steps && details.steps.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              Execution Steps ({details.steps.length})
                            </h4>
                            <div className="space-y-1">
                              {details.steps.map((step) => {
                                const errorSuggestion = !step.result.success && step.result.error
                                  ? getErrorSuggestion(step.result.error)
                                  : null;

                                return (
                                  <div
                                    key={step.stepNumber}
                                    className={`px-3 py-2 bg-white dark:bg-zinc-900 border rounded text-xs ${
                                      step.result.success
                                        ? 'border-zinc-200 dark:border-zinc-700'
                                        : 'border-red-200 dark:border-red-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                          Step {step.stepNumber}
                                        </span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                          {step.action}
                                        </span>
                                        {step.result.success ? (
                                          <CheckCircleIcon className="w-3 h-3 text-green-500" />
                                        ) : (
                                          <XCircleIcon className="w-3 h-3 text-red-500" />
                                        )}
                                      </div>
                                      <span className="text-zinc-400">
                                        {formatDuration(step.durationMs)}
                                      </span>
                                    </div>
                                    <p className={`${step.result.success ? 'text-zinc-600 dark:text-zinc-300' : 'text-red-600 dark:text-red-400'}`}>
                                      {step.result.description}
                                    </p>

                                    {/* Story 3.14 AC7: Error suggestion */}
                                    {errorSuggestion && (
                                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                                        <p className="text-blue-700 dark:text-blue-300 text-xs">
                                          💡 <strong>Suggestion:</strong> {errorSuggestion.message}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {executions.length >= limit && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setSkip(Math.max(0, skip - limit))}
            disabled={skip === 0}
            className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing {skip + 1}-{skip + executions.length}
          </span>
          <button
            onClick={() => setSkip(skip + limit)}
            disabled={executions.length < limit}
            className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Export Dialog (AC10) */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Export Execution Logs
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Export {totalCount} execution{totalCount !== 1 ? 's' : ''} with current filters applied.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                {isExporting ? 'Exporting...' : 'Export as JSON'}
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
              >
                {isExporting ? 'Exporting...' : 'Export as CSV'}
              </button>
            </div>
            <button
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
              className="w-full mt-3 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
