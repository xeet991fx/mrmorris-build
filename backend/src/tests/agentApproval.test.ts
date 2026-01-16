import request from 'supertest';
import mongoose from 'mongoose';
import Agent, { IAgent } from '../models/Agent';
import User from '../models/User';
import Project from '../models/Project';

// Mock BullMQ to prevent Redis connection during server import
jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        getRepeatableJobs: jest.fn().mockResolvedValue([]),
        removeRepeatableByKey: jest.fn(),
    })),
    Worker: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        close: jest.fn(),
    })),
}));

// Mock EmailService to prevent side effects
jest.mock('../services/email', () => ({
    sendEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendTeamInviteEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendWorkflowEmail: jest.fn(),
    sendOTPEmail: jest.fn(),
    sendFormNotificationEmail: jest.fn(),
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
    isAuthenticated: (req: any, res: any, next: any) => {
        req.user = {
            _id: '507f1f77bcf86cd799439011',
            email: 'test@example.com',
            name: 'Test User'
        };
        next();
    }
}));

import app from '../server';

describe('Agent Approval Configuration API', () => {
    let userId: mongoose.Types.ObjectId;
    let workspaceId: mongoose.Types.ObjectId;
    let agentId: mongoose.Types.ObjectId;
    let validApproverId: mongoose.Types.ObjectId;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-mrmorris');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clear database
        await Agent.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});

        // Setup test data
        userId = new mongoose.Types.ObjectId();
        workspaceId = new mongoose.Types.ObjectId();

        // Create a real user that can be used as approver
        const testUser = await User.create({
            email: 'approver@example.com',
            password: 'hashedpassword123',
            name: 'Test Approver'
        });
        validApproverId = testUser._id as mongoose.Types.ObjectId;

        // Create test agent
        const agent = await Agent.create({
            workspace: workspaceId,
            name: 'Test Agent',
            goal: 'Testing approval configuration',
            createdBy: userId,
            status: 'Draft'
        });
        agentId = agent._id as mongoose.Types.ObjectId;
    });

    // AC5: Disabled state
    it('should save approval config with enabled: false', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: false
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.agent.approvalConfig.enabled).toBe(false);
    });

    // AC2: Require approval for all actions
    it('should save approval config with requireForAllActions: true', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: true
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.agent.approvalConfig.enabled).toBe(true);
        expect(res.body.agent.approvalConfig.requireForAllActions).toBe(true);
    });

    // AC3: Specific actions require approval
    it('should save approval config with specific actions', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: false,
                    requiredForActions: ['send_email', 'update_deal_value']
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.agent.approvalConfig.enabled).toBe(true);
        expect(res.body.agent.approvalConfig.requireForAllActions).toBe(false);
        expect(res.body.agent.approvalConfig.requiredForActions).toContain('send_email');
        expect(res.body.agent.approvalConfig.requiredForActions).toContain('update_deal_value');
    });

    // Zod refinement: At least one action required when specific mode
    it('should reject empty requiredForActions when enabled and specific mode', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: false,
                    requiredForActions: []
                }
            });

        expect(res.status).toBe(400);
    });

    // Validation: Invalid action type
    it('should reject invalid action types', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: false,
                    requiredForActions: ['invalid_action']
                }
            });

        expect(res.status).toBe(400);
    });

    // AC4: Empty approvers allowed (defaults to owners/admins)
    it('should allow empty approvers array', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: true,
                    approvers: []
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.agent.approvalConfig.approvers).toEqual([]);
    });

    // AC4: Valid approvers accepted
    it('should accept valid approver IDs', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: true,
                    approvers: [validApproverId.toString()]
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.agent.approvalConfig.approvers).toHaveLength(1);
    });

    // AC4: Invalid approvers rejected (H1 fix validation)
    it('should reject invalid approver IDs', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: true,
                    approvers: [fakeUserId]
                }
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid approvers');
    });

    // Defaults apply correctly
    it('should apply default values when partial config provided', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: true
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.agent.approvalConfig.requiredForActions).toEqual([]);
        expect(res.body.agent.approvalConfig.approvers).toEqual([]);
    });

    // Merge partial updates
    it('should merge partial approval config with existing values', async () => {
        // First set initial config
        await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    enabled: true,
                    requireForAllActions: false,
                    requiredForActions: ['send_email']
                }
            });

        // Update just one field
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                approvalConfig: {
                    requiredForActions: ['send_email', 'linkedin_invite']
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.agent.approvalConfig.enabled).toBe(true); // Should remain
        expect(res.body.agent.approvalConfig.requiredForActions).toHaveLength(2); // Should update
    });
});
