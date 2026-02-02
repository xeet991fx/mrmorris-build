/**
 * NotificationService Tests
 * Story 5.2 - Automatic Token Refresh
 *
 * Tests for integration expiration notifications (Task 10.7)
 */

import { NotificationService } from './NotificationService';
import AINotification from '../models/AINotification';
import User from '../models/User';
import Project from '../models/Project';

// Mock dependencies
jest.mock('../models/AINotification');
jest.mock('../models/User');
jest.mock('../models/Project');

describe('NotificationService', () => {
    const workspaceId = '507f1f77bcf86cd799439012';
    const userId = '507f1f77bcf86cd799439013';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Project.findById to return workspace with userId
        (Project.findById as jest.Mock).mockResolvedValue({
            _id: workspaceId,
            userId,
        });
    });

    // ==========================================================================
    // AC3: Expired Refresh Token Handling - Notification (Task 10.7)
    // ==========================================================================

    describe('AC3: Integration expiration notifications (Task 10.7)', () => {
        it('should create notification when integration expires', async () => {
            const integrationType = 'gmail';

            await NotificationService.notifyIntegrationExpired(workspaceId, integrationType);

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId,
                    userId,
                    type: 'integration_expired',
                    title: '❌ Gmail integration expired',
                    priority: 'urgent',
                    status: 'pending',
                    metadata: expect.objectContaining({
                        integrationType: 'gmail',
                        affectedAgents: [],
                    }),
                    suggestedAction: expect.objectContaining({
                        label: 'Reconnect Now',
                        actionType: 'reconnect_integration',
                    }),
                })
            );
        });

        it('should include affected agents in notification message when provided (Task 6.4)', async () => {
            const integrationType = 'gmail';
            const affectedAgents = ['Email Bot', 'Sales Assistant', 'Support Agent'];

            await NotificationService.notifyIntegrationExpired(
                workspaceId,
                integrationType,
                affectedAgents
            );

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Email Bot, Sales Assistant, Support Agent'),
                    metadata: expect.objectContaining({
                        affectedAgents: ['Email Bot', 'Sales Assistant', 'Support Agent'],
                    }),
                })
            );
        });

        it('should truncate agent list when more than 3 agents affected', async () => {
            const integrationType = 'gmail';
            const affectedAgents = ['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4', 'Agent 5'];

            await NotificationService.notifyIntegrationExpired(
                workspaceId,
                integrationType,
                affectedAgents
            );

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Agent 1, Agent 2, Agent 3 and 2 more'),
                })
            );
        });

        it('should use display name for integration types', async () => {
            await NotificationService.notifyIntegrationExpired(workspaceId, 'calendar');

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '❌ Google Calendar integration expired',
                })
            );
        });

        it('should handle missing workspace owner gracefully', async () => {
            (Project.findById as jest.Mock).mockResolvedValue(null);
            (User.findOne as jest.Mock).mockResolvedValue(null);

            // Should not throw error
            await expect(
                NotificationService.notifyIntegrationExpired(workspaceId, 'gmail')
            ).resolves.not.toThrow();

            // Should not create notification
            expect(AINotification.create).not.toHaveBeenCalled();
        });

        it('should use sendIntegrationExpiredNotification alias', async () => {
            const affectedAgents = ['Test Agent'];

            await NotificationService.sendIntegrationExpiredNotification(
                workspaceId,
                'slack',
                affectedAgents
            );

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'integration_expired',
                    title: '❌ Slack integration expired',
                    metadata: expect.objectContaining({
                        affectedAgents: ['Test Agent'],
                    }),
                })
            );
        });
    });

    // ==========================================================================
    // AC7: Refresh Token Expiration Warning
    // ==========================================================================

    describe('AC7: Integration expiring warnings', () => {
        it('should create notification when integration is expiring in 7 days', async () => {
            const integrationType = 'gmail';
            const daysRemaining = 7;

            await NotificationService.notifyIntegrationExpiring(
                workspaceId,
                integrationType,
                daysRemaining
            );

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId,
                    userId,
                    type: 'integration_expiring',
                    title: '⚠️ Gmail expires in 7 days',
                    message: expect.stringContaining('will expire in 7 days'),
                    priority: 'medium',
                    metadata: expect.objectContaining({
                        integrationType: 'gmail',
                        daysRemaining: 7,
                    }),
                })
            );
        });

        it('should use high priority for 3 days remaining', async () => {
            await NotificationService.notifyIntegrationExpiring(workspaceId, 'gmail', 3);

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 'high',
                })
            );
        });

        it('should use urgent priority for 1 day remaining', async () => {
            await NotificationService.notifyIntegrationExpiring(workspaceId, 'gmail', 1);

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 'urgent',
                    title: '⚠️ Gmail expires in 1 day',
                })
            );
        });

        it('should use correct singular/plural day text', async () => {
            await NotificationService.notifyIntegrationExpiring(workspaceId, 'gmail', 1);

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: expect.stringContaining('1 day'),
                    message: expect.stringContaining('1 day'),
                })
            );
        });

        it('should use sendIntegrationExpiryWarning alias', async () => {
            await NotificationService.sendIntegrationExpiryWarning(workspaceId, 'gmail', 3);

            expect(AINotification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'integration_expiring',
                    priority: 'high',
                })
            );
        });
    });
});
