'use client';

/**
 * Story 3.15 Task 1.1: Agent Dashboard Component
 *
 * Displays agent performance metrics with:
 * - Total executions, success/failure rates (AC1-2)
 * - Average execution time (AC3)
 * - Date range selector (AC4)
 * - Action breakdown
 * - Visual indicators (color-coded based on performance targets)
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BoltIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { getAgentDashboard, exportAgentConfig, type DashboardMetrics } from '@/lib/api/agents';
import { toast } from 'sonner';
import { PerformanceWarningCard, detectPerformanceWarnings, type PerformanceWarning } from './PerformanceWarningCard';

interface AgentDashboardProps {
  workspaceId: string;
  agentId: string;
}

export function AgentDashboard({ workspaceId, agentId }: AgentDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [agentName, setAgentName] = useState<string>('');
  const [warnings, setWarnings] = useState<PerformanceWarning[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [comparePrevious, setComparePrevious] = useState(false); // Task 2.1

  useEffect(() => {
    fetchDashboard();
  }, [workspaceId, agentId, dateRange, comparePrevious]);

  // Task 5.2-5.5: Handle export agent configuration
  const handleExportConfig = async () => {
    try {
      setIsExporting(true);
      await exportAgentConfig(workspaceId, agentId, agentName);
      toast.success('Agent configuration exported successfully');
    } catch (error: any) {
      console.error('Error exporting config:', error);
      toast.error('Failed to export agent configuration');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await getAgentDashboard(workspaceId, agentId, dateRange, comparePrevious);
      if (response.success && response.data) {
        setMetrics(response.data.metrics);
        setAgentName(response.data.agentName);

        // Task 4.1: Detect performance warnings
        const detectedWarnings = detectPerformanceWarnings(
          {
            totalExecutions: response.data.metrics.totalExecutions,
            successRate: response.data.metrics.successRate,
            avgDurationSeconds: response.data.metrics.avgDurationSeconds,
          },
          dateRange
        );
        setWarnings(detectedWarnings);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  // Task 1.4: Visual indicators based on performance targets
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (rate >= 80) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  const getExecutionTimeColor = (seconds: number) => {
    if (seconds <= 30) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (seconds <= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  const dateRangeOptions = [
    { value: '7d' as const, label: 'Last 7 Days' },
    { value: '30d' as const, label: 'Last 30 Days' },
    { value: '90d' as const, label: 'Last 90 Days' },
    { value: 'all' as const, label: 'All Time' },
  ];

  // Task 2.3: Helper to format trend indicator
  const formatTrend = (change: number, isPercentage: boolean = false, inverseGood: boolean = false) => {
    if (!change || change === 0) return null;

    const isPositive = change > 0;
    const isGood = inverseGood ? !isPositive : isPositive;
    const color = isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
    const sign = isPositive ? '+' : '';

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {sign}{isPercentage ? `${change.toFixed(1)}%` : change}
      </span>
    );
  };

  if (isLoading && !metrics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Performance Dashboard
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No metrics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector and Export Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5" />
          Performance Dashboard
        </h3>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Task 2.1: Compare to previous period toggle */}
          {dateRange !== 'all' && (
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={comparePrevious}
                onChange={(e) => setComparePrevious(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700"
              />
              Compare to previous period
            </label>
          )}

          {/* Task 5.2: Export Configuration Button */}
          <button
            onClick={handleExportConfig}
            disabled={isExporting}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Config'}
          </button>

          {/* Task 1.5: Date range selector */}
          <div className="flex items-center gap-2">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${dateRange === option.value
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task 1.4: Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Executions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Executions
            </p>
            <BoltIcon className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {metrics.totalExecutions}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {metrics.successCount} completed, {metrics.failedCount} failed
            {/* Task 2.3: Show trend */}
            {metrics.change && metrics.change.totalExecutions !== 0 && (
              <span className="ml-2">
                {formatTrend(metrics.change.totalExecutions)}
              </span>
            )}
          </p>
        </motion.div>

        {/* Success Rate - Task 1.4: Color-coded */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`border rounded-lg p-4 ${getSuccessRateColor(metrics.successRate)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Success Rate</p>
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">
            {metrics.successRate.toFixed(1)}%
          </p>
          <p className="text-xs mt-1">
            {metrics.successCount} of {metrics.totalExecutions} executions
            {/* Task 2.3: Show trend */}
            {metrics.change && metrics.change.successRate !== 0 && (
              <span className="ml-2">
                {formatTrend(metrics.change.successRate, true)}
              </span>
            )}
          </p>
          {metrics.successRate < 90 && (
            <p className="text-xs mt-2 font-medium">Target: 90%+</p>
          )}
        </motion.div>

        {/* Average Execution Time - Task 1.4: Color-coded */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`border rounded-lg p-4 ${getExecutionTimeColor(metrics.avgDurationSeconds)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Avg Execution Time</p>
            <ClockIcon className="w-5 h-5" />
          </div>
          <p className="text-3xl font-bold">
            {metrics.avgDurationSeconds}s
          </p>
          <p className="text-xs mt-1">
            {(metrics.avgDurationMs / 1000).toFixed(2)}s average
            {/* Task 2.3: Show trend (lower is better, so inverse) */}
            {metrics.change && metrics.change.avgDurationMs !== 0 && (
              <span className="ml-2">
                {formatTrend(Math.round(metrics.change.avgDurationMs / 1000), false, true)}
              </span>
            )}
          </p>
          {metrics.avgDurationSeconds > 30 && (
            <p className="text-xs mt-2 font-medium">Target: &lt;30s</p>
          )}
        </motion.div>

        {/* Total Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Actions
            </p>
            <ChartBarIcon className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {metrics.totalSteps}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {metrics.totalCreditsUsed} credits used
          </p>
        </motion.div>
      </div>

      {/* Task 4.2-4.4: Performance Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          {warnings.map((warning, index) => (
            <PerformanceWarningCard
              key={index}
              warning={warning}
            />
          ))}
        </div>
      )}

      {/* Task 1.6: Action Breakdown */}
      {metrics.actionBreakdown && metrics.actionBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        >
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Action Breakdown
          </h4>
          <div className="space-y-2">
            {metrics.actionBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {item.action.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {metrics.totalExecutions === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <BoltIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No executions yet for this agent</p>
          <p className="text-sm mt-1">Metrics will appear after first execution</p>
        </div>
      )}
    </div>
  );
}
