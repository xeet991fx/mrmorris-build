/**
 * NotificationService Email Delivery Tests
 * Story 5.3 - Integration Expiration Notifications
 * Task 11.2: Test email delivery for integration expiration warnings
 */

import { NotificationService } from '../NotificationService';
import EmailService from '../email';
import User from '../../models/User';
import Project from '../../models/Project';
import AINotification from '../../models/AINotification';

// Mock dependencies
jest.mock('../email', () => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/User');
jest.mock('../../models/Project');
jest.mock('../../models/AINotification');
jest.mock('../../utils/emailTemplates', () => ({
    renderIntegrationExpiringEmail: jest.fn((data) => `<html>Expiring: ${data.integrationName}</html>`),
    renderIntegrationExpiredEmail: jest.fn((data) => `<html>Expired: ${data.integrationName}</html>`),
}));

describe('NotificationService - Email Delivery', () => {
    const mockWorkspaceId = '507f1f77bcf86cd799439011';
    const mockUserId = '507f1f77bcf86cd799439012';
    const mockUserEmail = 'test@example.com';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock Project.findById to return workspace with userId
        (Project.findById as jest.Mock).mockResolvedValue({
            _id: mockWorkspaceId,
            userId: mockUserId,
        });

        // Mock User.findById to return user with email
        (User.findById as jest.Mock).mockResolvedValue({
            _id: mockUserId,
            email: mockUserEmail,
            name: 'Test User',
        });

        // Mock AINotification.create
        (AINotification.create as jest.Mock).mockResolvedValue({});
    });

    describe('notifyIntegrationExpiring - Email Delivery', () => {
        it('should send email for 7-day expiration warning', async () => {
            await NotificationService.notifyIntegrationExpiring(mockWorkspaceId, 'gmail', 7);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: 'Gmail integration expires in 7 days',
                html: expect.stringContaining('Gmail'),
            });
        });

        it('should include affected agents in expiring email', async () => {
            await NotificationService.notifyIntegrationExpiring(
                mockWorkspaceId,
                'linkedin',
                3,
                ['Outbound Campaign', 'Follow-up Agent']
            );

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: 'LinkedIn integration expires in 3 days',
                html: expect.any(String),
            });
        });

        it('should handle 1-day expiration with singular "day"', async () => {
            await NotificationService.notifyIntegrationExpiring(mockWorkspaceId, 'slack', 1);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: expect.stringContaining('1 day'),
                html: expect.any(String),
            });
        });

        it('should not send email if workspace owner not found', async () => {
            (Project.findById as jest.Mock).mockResolvedValue(null);

            await NotificationService.notifyIntegrationExpiring(mockWorkspaceId, 'gmail', 7);

            expect(EmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('should not send email if user email not found', async () => {
            (User.findById as jest.Mock).mockResolvedValue({
                _id: mockUserId,
                email: null,
            });

            await NotificationService.notifyIntegrationExpiring(mockWorkspaceId, 'gmail', 7);

            expect(EmailService.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('notifyIntegrationExpired - Email Delivery', () => {
        it('should send email for expired integration', async () => {
            await NotificationService.notifyIntegrationExpired(mockWorkspaceId, 'gmail', [
                'Outbound Campaign',
                'Follow-up Agent',
            ]);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: 'Gmail integration has expired',
                html: expect.stringContaining('Gmail'),
            });
        });

        it('should include list of affected agents in expired email', async () => {
            const agents = ['Outbound Campaign', 'Follow-up Agent', 'Weekly Report'];

            await NotificationService.notifyIntegrationExpired(mockWorkspaceId, 'slack', agents);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: 'Slack integration has expired',
                html: expect.any(String),
            });
        });

        it('should truncate agent list if more than 3 agents', async () => {
            const agents = ['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4', 'Agent 5'];

            await NotificationService.notifyIntegrationExpired(mockWorkspaceId, 'linkedin', agents);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: 'LinkedIn integration has expired',
                html: expect.any(String),
            });
        });

        it('should handle expired notification without affected agents', async () => {
            await NotificationService.notifyIntegrationExpired(mockWorkspaceId, 'google_sheets');

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: 'Google Sheets integration has expired',
                html: expect.any(String),
            });
        });
    });

    describe('Email Template Content', () => {
        it('should include reconnect link in expiring email', async () => {
            await NotificationService.notifyIntegrationExpiring(mockWorkspaceId, 'gmail', 7);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: expect.any(String),
                html: expect.any(String),
            });
        });

        it('should include reconnect link in expired email', async () => {
            await NotificationService.notifyIntegrationExpired(mockWorkspaceId, 'gmail', []);

            expect(EmailService.sendEmail).toHaveBeenCalledWith({
                to: mockUserEmail,
                subject: expect.any(String),
                html: expect.any(String),
            });
        });
    });
});
