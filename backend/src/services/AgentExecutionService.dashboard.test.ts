/**
 * Story 3.15 Task 8: Unit Tests for Dashboard Metrics
 *
 * Tests for getDashboardMetrics() service method:
 * - Task 8.1: Calculates correct success rate
 * - Task 8.2: Filters by date range correctly
 */

import mongoose from 'mongoose';
import AgentExecutionService from './AgentExecutionService';
import AgentExecution, { IAgentExecution } from '../models/AgentExecution';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  const mockObjectId = jest.fn((id) => ({
    _id: id,
    toString: () => id,
    equals: (other: any) => other === id || other?._id === id,
  }));

  return {
    ...actualMongoose,
    Types: {
      ObjectId: mockObjectId,
    },
  };
});

// Mock AgentExecution model
jest.mock('../models/AgentExecution');

describe('AgentExecutionService.getDashboardMetrics', () => {
  const workspaceId = 'workspace123';
  const agentId = 'agent456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Task 8.1: Unit test - getDashboardMetrics() calculates correct success rate
   */
  describe('Success Rate Calculation', () => {
    it('should calculate 90% success rate with 90 Success and 10 Failed executions', async () => {
      // Mock aggregation results
      const mockMetricsResult = [
        {
          totalExecutions: 100,
          successCount: 90,
          failedCount: 10,
          successRate: 90, // 90 / 100 * 100 = 90%
          failureRate: 10,
          avgDurationMs: 25000,
          totalSteps: 450,
          totalCredits: 180,
        },
      ];

      const mockActionBreakdown = [
        { action: 'send_email', count: 120 },
        { action: 'create_task', count: 80 },
      ];

      // Mock aggregate method
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce(mockMetricsResult) // First call for metrics
        .mockResolvedValueOnce(mockActionBreakdown); // Second call for action breakdown

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      // Execute
      const result = await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '30d'
      );

      // Assert success rate
      expect(result.successRate).toBe(90);
      expect(result.failureRate).toBe(10);
      expect(result.totalExecutions).toBe(100);
      expect(result.successCount).toBe(90);
      expect(result.failedCount).toBe(10);

      // Verify workspace isolation
      expect(mockAggregate).toHaveBeenCalled();
      const firstCall = mockAggregate.mock.calls[0][0];
      const matchStage = firstCall[0].$match;
      expect(matchStage.workspace._id).toBe(workspaceId);
      expect(matchStage.agent._id).toBe(agentId);
    });

    it('should calculate 100% success rate with all completed executions', async () => {
      const mockMetricsResult = [
        {
          totalExecutions: 50,
          successCount: 50,
          failedCount: 0,
          successRate: 100,
          failureRate: 0,
          avgDurationMs: 20000,
          totalSteps: 250,
          totalCredits: 100,
        },
      ];

      const mockAggregate = jest.fn()
        .mockResolvedValueOnce(mockMetricsResult)
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      const result = await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        'all'
      );

      expect(result.successRate).toBe(100);
      expect(result.failureRate).toBe(0);
    });

    it('should calculate 0% success rate with all failed executions', async () => {
      const mockMetricsResult = [
        {
          totalExecutions: 20,
          successCount: 0,
          failedCount: 20,
          successRate: 0,
          failureRate: 100,
          avgDurationMs: 15000,
          totalSteps: 40,
          totalCredits: 0,
        },
      ];

      const mockAggregate = jest.fn()
        .mockResolvedValueOnce(mockMetricsResult)
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      const result = await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '7d'
      );

      expect(result.successRate).toBe(0);
      expect(result.failureRate).toBe(100);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(20);
    });
  });

  /**
   * Task 8.2: Unit test - getDashboardMetrics() filters by date range correctly
   */
  describe('Date Range Filtering', () => {
    it('should filter executions for last 7 days when dateRange is "7d"', async () => {
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce([
          {
            totalExecutions: 10,
            successCount: 9,
            failedCount: 1,
            successRate: 90,
            failureRate: 10,
            avgDurationMs: 22000,
            totalSteps: 50,
            totalCredits: 20,
          },
        ])
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '7d'
      );

      // Verify $match stage includes startedAt filter
      const matchStage = mockAggregate.mock.calls[0][0][0].$match;
      expect(matchStage.startedAt).toBeDefined();
      expect(matchStage.startedAt.$gte).toBeInstanceOf(Date);

      // Verify date is approximately 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = matchStage.startedAt.$gte;
      const diffInDays = Math.abs((startDate.getTime() - sevenDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBeLessThan(0.1); // Allow small time difference
    });

    it('should filter executions for last 30 days when dateRange is "30d"', async () => {
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce([
          {
            totalExecutions: 45,
            successCount: 40,
            failedCount: 5,
            successRate: 88.89,
            failureRate: 11.11,
            avgDurationMs: 28000,
            totalSteps: 225,
            totalCredits: 90,
          },
        ])
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '30d'
      );

      const matchStage = mockAggregate.mock.calls[0][0][0].$match;
      expect(matchStage.startedAt).toBeDefined();

      // Verify date is approximately 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = matchStage.startedAt.$gte;
      const diffInDays = Math.abs((startDate.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBeLessThan(0.1);
    });

    it('should filter executions for last 90 days when dateRange is "90d"', async () => {
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce([
          {
            totalExecutions: 120,
            successCount: 108,
            failedCount: 12,
            successRate: 90,
            failureRate: 10,
            avgDurationMs: 30000,
            totalSteps: 600,
            totalCredits: 240,
          },
        ])
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '90d'
      );

      const matchStage = mockAggregate.mock.calls[0][0][0].$match;
      expect(matchStage.startedAt).toBeDefined();

      // Verify date is approximately 90 days ago
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const startDate = matchStage.startedAt.$gte;
      const diffInDays = Math.abs((startDate.getTime() - ninetyDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBeLessThan(0.1);
    });

    it('should not filter by date when dateRange is "all"', async () => {
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce([
          {
            totalExecutions: 500,
            successCount: 450,
            failedCount: 50,
            successRate: 90,
            failureRate: 10,
            avgDurationMs: 25000,
            totalSteps: 2500,
            totalCredits: 1000,
          },
        ])
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        'all'
      );

      // Verify $match stage does NOT include startedAt filter
      const matchStage = mockAggregate.mock.calls[0][0][0].$match;
      expect(matchStage.startedAt).toBeUndefined();
      expect(matchStage.workspace._id).toBe(workspaceId);
      expect(matchStage.agent._id).toBe(agentId);
    });
  });

  /**
   * Task 8.2: Additional test - Action breakdown aggregation
   */
  describe('Action Breakdown', () => {
    it('should return action breakdown sorted by count', async () => {
      const mockMetricsResult = [
        {
          totalExecutions: 50,
          successCount: 45,
          failedCount: 5,
          successRate: 90,
          failureRate: 10,
          avgDurationMs: 22000,
          totalSteps: 250,
          totalCredits: 100,
        },
      ];

      const mockActionBreakdown = [
        { action: 'send_email', count: 80 },
        { action: 'create_task', count: 60 },
        { action: 'web_search', count: 40 },
        { action: 'update_field', count: 30 },
        { action: 'add_tag', count: 40 },
      ];

      const mockAggregate = jest.fn()
        .mockResolvedValueOnce(mockMetricsResult)
        .mockResolvedValueOnce(mockActionBreakdown);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      const result = await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '30d'
      );

      // Verify action breakdown is included
      expect(result.actionBreakdown).toEqual(mockActionBreakdown);
      expect(result.actionBreakdown[0].action).toBe('send_email');
      expect(result.actionBreakdown[0].count).toBe(80);
    });
  });

  /**
   * Edge cases
   */
  describe('Edge Cases', () => {
    it('should return default metrics when no executions found', async () => {
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce([]) // Empty results
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      const result = await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '30d'
      );

      expect(result.totalExecutions).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.failureRate).toBe(0);
      expect(result.avgDurationMs).toBe(0);
      expect(result.actionBreakdown).toEqual([]);
    });

    it('should enforce workspace isolation in query', async () => {
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      (AgentExecution.aggregate as jest.Mock) = mockAggregate;

      await AgentExecutionService.getDashboardMetrics(
        workspaceId,
        agentId,
        '30d'
      );

      // Verify both aggregation calls enforce workspace filter
      expect(mockAggregate).toHaveBeenCalledTimes(2);
      mockAggregate.mock.calls.forEach((call) => {
        const matchStage = call[0][0].$match;
        expect(matchStage.workspace._id).toBe(workspaceId);
        expect(matchStage.agent._id).toBe(agentId);
      });
    });
  });
});
