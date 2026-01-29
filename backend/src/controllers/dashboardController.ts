/**
 * dashboardController.ts - Story 3.15: Export and Dashboard
 *
 * Handles agent dashboard metrics and analytics endpoints.
 * Provides aggregated performance data for agents and workspaces.
 */

import { Request, Response } from 'express';
import AgentExecutionService from '../services/AgentExecutionService';
import Agent from '../models/Agent';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';

/**
 * Story 3.15 Task 1.2: Get dashboard metrics for a single agent
 * GET /api/workspaces/:workspaceId/agents/:agentId/dashboard
 *
 * Query params:
 * - dateRange: '7d' | '30d' | '90d' | 'all' (default: '30d')
 *
 * Returns aggregated metrics:
 * - Total executions
 * - Success/failure rates
 * - Average execution time
 * - Action breakdown
 */
export const getAgentDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const { dateRange = '30d', comparePrevious = 'false' } = req.query;

    // Validate date range
    const validDateRanges = ['7d', '30d', '90d', 'all'];
    if (!validDateRanges.includes(dateRange as string)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date range. Must be one of: 7d, 30d, 90d, all'
      });
      return;
    }

    // Task 7.1: Check cache first (5-minute TTL)
    const cacheKey = `dashboard:metrics:${workspaceId}:${agentId}:${dateRange}:${comparePrevious}`;
    const redis = getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          res.json({
            success: true,
            data: cachedData,
            cached: true
          });
          return;
        }
      } catch (cacheError) {
        console.warn('Redis cache read error:', cacheError);
        // Continue without cache on error
      }
    }

    // Verify agent exists and belongs to workspace
    const agent = await Agent.findOne({
      _id: agentId,
      workspace: workspaceId
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Get dashboard metrics
    const metrics = await AgentExecutionService.getDashboardMetrics(
      workspaceId,
      agentId,
      dateRange as '7d' | '30d' | '90d' | 'all',
      comparePrevious === 'true'
    );

    const responseData = {
      agentId,
      agentName: agent.name,
      dateRange,
      metrics: {
        totalExecutions: metrics.totalExecutions,
        successCount: metrics.successCount,
        failedCount: metrics.failedCount,
        successRate: Math.round(metrics.successRate * 10) / 10, // Round to 1 decimal
        failureRate: Math.round(metrics.failureRate * 10) / 10,
        avgDurationSeconds: Math.round(metrics.avgDurationMs / 1000), // Convert to seconds
        avgDurationMs: metrics.avgDurationMs,
        totalSteps: metrics.totalSteps,
        totalCreditsUsed: metrics.totalCredits,
        actionBreakdown: metrics.actionBreakdown,
        // Task 2.2: Include previous period metrics if requested
        ...(metrics.previous && {
          previous: {
            totalExecutions: metrics.previous.totalExecutions,
            successRate: Math.round(metrics.previous.successRate * 10) / 10,
            avgDurationMs: metrics.previous.avgDurationMs,
          }
        }),
        // Task 2.2: Include change metrics
        ...(metrics.change && {
          change: {
            totalExecutions: metrics.change.totalExecutions,
            successRate: Math.round(metrics.change.successRate * 10) / 10,
            avgDurationMs: Math.round(metrics.change.avgDurationMs),
          }
        }),
      }
    };

    // Task 7.1: Cache the response (5-minute TTL)
    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(responseData)); // 5 minutes = 300 seconds
      } catch (cacheError) {
        console.warn('Redis cache write error:', cacheError);
        // Continue without caching on error
      }
    }

    res.json({
      success: true,
      data: responseData,
      cached: false
    });
  } catch (error: any) {
    console.error('Error fetching agent dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      details: error.message
    });
  }
};

/**
 * Story 3.15 Task 3.2: Get dashboard metrics for all agents in workspace
 * GET /api/workspaces/:workspaceId/agents/dashboard-all
 *
 * Query params:
 * - dateRange: '7d' | '30d' | '90d' | 'all' (default: '30d')
 * - sortBy: 'name' | 'executions' | 'successRate' | 'lastRun' (default: 'name')
 * - sortOrder: 'asc' | 'desc' (default: 'asc')
 *
 * Returns array of agent metrics for comparison table
 */
export const getAllAgentsDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d', sortBy = 'name', sortOrder = 'asc' } = req.query;

    // Validate parameters
    const validDateRanges = ['7d', '30d', '90d', 'all'];
    if (!validDateRanges.includes(dateRange as string)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date range. Must be one of: 7d, 30d, 90d, all'
      });
      return;
    }

    const validSortBy = ['name', 'executions', 'successRate', 'lastRun'];
    if (!validSortBy.includes(sortBy as string)) {
      res.status(400).json({
        success: false,
        error: 'Invalid sortBy. Must be one of: name, executions, successRate, lastRun'
      });
      return;
    }

    // Get all agents in workspace
    const agents = await Agent.find({ workspace: workspaceId }).select('_id name status');

    // Fetch metrics for each agent in parallel
    // M2 Fix: Also get actual last execution date
    const agentMetricsPromises = agents.map(async (agent) => {
      const metrics = await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agent._id.toString(),
        dateRange as '7d' | '30d' | '90d' | 'all'
      );

      // M2 Fix: Get actual last run date from most recent execution
      let lastRun: Date | null = null;
      if (metrics.totalExecutions > 0) {
        const { default: AgentExecution } = await import('../models/AgentExecution');
        const lastExecution = await AgentExecution.findOne({
          agent: new mongoose.Types.ObjectId(agent._id.toString()),
          workspace: new mongoose.Types.ObjectId(workspaceId),
        })
          .sort({ startedAt: -1 })
          .select('startedAt')
          .lean();
        lastRun = lastExecution?.startedAt || null;
      }

      return {
        agentId: agent._id.toString(),
        agentName: agent.name,
        agentStatus: agent.status,
        totalExecutions: metrics.totalExecutions,
        successRate: Math.round(metrics.successRate * 10) / 10,
        avgDurationSeconds: Math.round(metrics.avgDurationMs / 1000),
        totalCreditsUsed: metrics.totalCredits,
        lastRun,
      };
    });

    let agentMetrics = await Promise.all(agentMetricsPromises);

    // Task 3.3: Sort results
    agentMetrics.sort((a, b) => {
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
        case 'lastRun':
          const aTime = a.lastRun ? a.lastRun.getTime() : 0;
          const bTime = b.lastRun ? b.lastRun.getTime() : 0;
          compareValue = aTime - bTime;
          break;
      }

      return sortOrder === 'desc' ? -compareValue : compareValue;
    });

    res.json({
      success: true,
      data: {
        workspaceId,
        dateRange,
        agents: agentMetrics,
        totalAgents: agentMetrics.length,
      }
    });
  } catch (error: any) {
    console.error('Error fetching workspace dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workspace dashboard',
      details: error.message
    });
  }
};
