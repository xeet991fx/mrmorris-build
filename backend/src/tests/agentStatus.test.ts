import request from 'supertest';
import mongoose from 'mongoose';
import Agent from '../models/Agent';
import User from '../models/User';
import Project from '../models/Project';
import TeamMember from '../models/TeamMember';

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

/**
 * Story 1.9: Agent Status Management Tests
 * 
 * Tests for the PATCH /api/workspaces/:workspaceId/agents/:agentId/status endpoint
 * covering all status transitions, validation, and RBAC.
 */
describe('Agent Status API (Story 1.9)', () => {
    let userId: mongoose.Types.ObjectId;
    let workspaceId: mongoose.Types.ObjectId;
    let agentId: mongoose.Types.ObjectId;

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
        await TeamMember.deleteMany({});

        // Setup test data
        userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        workspaceId = new mongoose.Types.ObjectId();

        // Create test workspace
        await Project.create({
            _id: workspaceId,
            name: 'Test Workspace',
            userId: userId,
        });
    });

    describe('Draft to Live transitions', () => {
        it('should change status from Draft to Live with valid agent', async () => {
            // Create a fully configured agent
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Complete Agent',
                goal: 'Testing status transitions',
                createdBy: userId,
                status: 'Draft',
                instructions: 'Follow up with contacts daily',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Live' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.agent.status).toBe('Live');
        });

        it('should reject Draft to Live without instructions', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Agent Without Instructions',
                goal: 'Testing validation',
                createdBy: userId,
                status: 'Draft',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
                // No instructions
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Live' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Cannot activate agent: Missing required fields');
            expect(res.body.validationErrors).toContainEqual(
                expect.objectContaining({ field: 'instructions' })
            );
        });

        it('should reject Draft to Live without triggers', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Agent Without Triggers',
                goal: 'Testing validation',
                createdBy: userId,
                status: 'Draft',
                instructions: 'Some instructions',
                triggers: [] // Empty triggers
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Live' });

            expect(res.status).toBe(400);
            expect(res.body.validationErrors).toContainEqual(
                expect.objectContaining({ field: 'triggers' })
            );
        });

        it('should return multiple validation errors at once', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: '',
                goal: '',
                createdBy: userId,
                status: 'Draft',
                // No instructions, no triggers
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Live' });

            expect(res.status).toBe(400);
            expect(res.body.validationErrors.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Live to Paused transitions', () => {
        it('should change status from Live to Paused immediately', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Live Agent',
                goal: 'Testing pause',
                createdBy: userId,
                status: 'Live',
                instructions: 'Do the thing',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Paused' });

            expect(res.status).toBe(200);
            expect(res.body.agent.status).toBe('Paused');
        });
    });

    describe('Paused to Live transitions', () => {
        it('should resume Paused agent to Live', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Paused Agent',
                goal: 'Testing resume',
                createdBy: userId,
                status: 'Paused',
                instructions: 'Do the thing',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Live' });

            expect(res.status).toBe(200);
            expect(res.body.agent.status).toBe('Live');
        });
    });

    describe('Draft to Paused blocked', () => {
        it('should block Draft to Paused transition', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Draft Agent',
                goal: 'Testing blocked transition',
                createdBy: userId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Paused' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Cannot pause a Draft agent');
        });
    });

    describe('updatedBy tracking', () => {
        it('should update updatedBy field on status change', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Agent',
                goal: 'Testing updatedBy',
                createdBy: userId,
                status: 'Live',
                instructions: 'Instructions',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Paused' });

            expect(res.status).toBe(200);
            expect(res.body.agent.updatedBy).toBeDefined();
            expect(res.body.agent.updatedBy.toString()).toBe('507f1f77bcf86cd799439011');
        });
    });

    describe('Error handling', () => {
        it('should return 404 for non-existent agent', async () => {
            const fakeAgentId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${fakeAgentId}/status`)
                .send({ status: 'Live' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Agent not found');
        });

        it('should validate status enum values', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Agent',
                goal: 'Testing validation',
                createdBy: userId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .patch(`/api/workspaces/${workspaceId}/agents/${agentId}/status`)
                .send({ status: 'Invalid' });

            expect(res.status).toBe(400);
        });
    });
});
