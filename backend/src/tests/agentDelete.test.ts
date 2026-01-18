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

// Store the original userId for RBAC tests
const testUserId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439022';

// Mock auth middleware - default to test user
jest.mock('../middleware/auth', () => ({
    isAuthenticated: (req: any, res: any, next: any) => {
        req.user = {
            _id: req.headers['x-test-user-id'] || testUserId,
            email: 'test@example.com',
            name: 'Test User'
        };
        next();
    }
}));

import app from '../server';

/**
 * Story 1.10: Delete Agent Tests
 *
 * Tests for the DELETE /api/workspaces/:workspaceId/agents/:agentId endpoint
 * covering deletion, RBAC, and workspace isolation.
 */
describe('Delete Agent API (Story 1.10)', () => {
    let userId: mongoose.Types.ObjectId;
    let workspaceId: mongoose.Types.ObjectId;
    let otherWorkspaceId: mongoose.Types.ObjectId;
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
        userId = new mongoose.Types.ObjectId(testUserId);
        workspaceId = new mongoose.Types.ObjectId();
        otherWorkspaceId = new mongoose.Types.ObjectId();

        // Create test workspace (owned by test user)
        await Project.create({
            _id: workspaceId,
            name: 'Test Workspace',
            userId: userId,
        });

        // Create another workspace (not owned by test user)
        await Project.create({
            _id: otherWorkspaceId,
            name: 'Other Workspace',
            userId: new mongoose.Types.ObjectId(otherUserId),
        });
    });

    describe('Successful deletion', () => {
        it('should delete a Draft agent successfully', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Draft Agent',
                goal: 'Testing deletion',
                createdBy: userId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${workspaceId}/agents/${agentId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Agent deleted successfully');

            // Verify agent is actually deleted
            const deletedAgent = await Agent.findById(agentId);
            expect(deletedAgent).toBeNull();
        });

        it('should delete a Live agent successfully', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Live Agent',
                goal: 'Testing live deletion',
                createdBy: userId,
                status: 'Live',
                instructions: 'Do the thing',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${workspaceId}/agents/${agentId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Agent deleted successfully');

            // Verify agent is actually deleted
            const deletedAgent = await Agent.findById(agentId);
            expect(deletedAgent).toBeNull();
        });

        it('should delete a Paused agent successfully', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Paused Agent',
                goal: 'Testing paused deletion',
                createdBy: userId,
                status: 'Paused',
                instructions: 'Do the thing',
                triggers: [{ type: 'manual', config: {}, enabled: true }]
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${workspaceId}/agents/${agentId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Error handling', () => {
        it('should return 404 for non-existent agent', async () => {
            const fakeAgentId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .delete(`/api/workspaces/${workspaceId}/agents/${fakeAgentId}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Agent not found');
        });

        it('should return 404 for non-existent workspace', async () => {
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Test Agent',
                goal: 'Testing',
                createdBy: userId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;
            const fakeWorkspaceId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .delete(`/api/workspaces/${fakeWorkspaceId}/agents/${agentId}`);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Workspace not found');
        });
    });

    describe('Workspace isolation', () => {
        it('should not delete agent from different workspace (workspace isolation)', async () => {
            // Create agent in other workspace
            const agent = await Agent.create({
                workspace: otherWorkspaceId,
                name: 'Other Workspace Agent',
                goal: 'Testing workspace isolation',
                createdBy: new mongoose.Types.ObjectId(otherUserId),
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            // Try to delete using our workspace ID (should fail - agent not found in our workspace)
            const res = await request(app)
                .delete(`/api/workspaces/${workspaceId}/agents/${agentId}`);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Agent not found');

            // Verify agent still exists
            const existingAgent = await Agent.findById(agentId);
            expect(existingAgent).not.toBeNull();
        });
    });

    describe('RBAC permission checks', () => {
        it('should allow workspace creator to delete without TeamMember record', async () => {
            // User is workspace creator (Project.userId matches)
            const agent = await Agent.create({
                workspace: workspaceId,
                name: 'Creator Test Agent',
                goal: 'Testing creator permissions',
                createdBy: userId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${workspaceId}/agents/${agentId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should allow admin TeamMember to delete', async () => {
            // Create workspace owned by someone else
            const adminWorkspaceId = new mongoose.Types.ObjectId();
            const ownerUserId = new mongoose.Types.ObjectId();

            await Project.create({
                _id: adminWorkspaceId,
                name: 'Admin Test Workspace',
                userId: ownerUserId,
            });

            // Create TeamMember with admin role for our test user
            await TeamMember.create({
                workspaceId: adminWorkspaceId,
                userId: userId,
                role: 'admin',
                status: 'active',
            });

            const agent = await Agent.create({
                workspace: adminWorkspaceId,
                name: 'Admin Delete Test',
                goal: 'Testing admin permissions',
                createdBy: ownerUserId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${adminWorkspaceId}/agents/${agentId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should allow owner TeamMember to delete', async () => {
            // Create workspace owned by someone else
            const ownerWorkspaceId = new mongoose.Types.ObjectId();
            const originalOwnerId = new mongoose.Types.ObjectId();

            await Project.create({
                _id: ownerWorkspaceId,
                name: 'Owner Test Workspace',
                userId: originalOwnerId,
            });

            // Create TeamMember with owner role for our test user
            await TeamMember.create({
                workspaceId: ownerWorkspaceId,
                userId: userId,
                role: 'owner',
                status: 'active',
            });

            const agent = await Agent.create({
                workspace: ownerWorkspaceId,
                name: 'Owner Delete Test',
                goal: 'Testing owner permissions',
                createdBy: originalOwnerId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${ownerWorkspaceId}/agents/${agentId}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should return 403 for member role (not owner/admin)', async () => {
            // Create workspace owned by someone else
            const memberWorkspaceId = new mongoose.Types.ObjectId();
            const ownerUserId = new mongoose.Types.ObjectId();

            await Project.create({
                _id: memberWorkspaceId,
                name: 'Member Test Workspace',
                userId: ownerUserId,
            });

            // Create TeamMember with member role for our test user
            await TeamMember.create({
                workspaceId: memberWorkspaceId,
                userId: userId,
                role: 'member',
                status: 'active',
            });

            const agent = await Agent.create({
                workspace: memberWorkspaceId,
                name: 'Member Delete Test',
                goal: 'Testing member denied',
                createdBy: ownerUserId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${memberWorkspaceId}/agents/${agentId}`);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe("You don't have permission to delete agents");

            // Verify agent still exists
            const existingAgent = await Agent.findById(agentId);
            expect(existingAgent).not.toBeNull();
        });

        it('should return 403 for inactive TeamMember', async () => {
            // Create workspace owned by someone else
            const inactiveWorkspaceId = new mongoose.Types.ObjectId();
            const ownerUserId = new mongoose.Types.ObjectId();

            await Project.create({
                _id: inactiveWorkspaceId,
                name: 'Inactive Test Workspace',
                userId: ownerUserId,
            });

            // Create TeamMember with admin role but inactive status
            await TeamMember.create({
                workspaceId: inactiveWorkspaceId,
                userId: userId,
                role: 'admin',
                status: 'inactive',  // Inactive!
            });

            const agent = await Agent.create({
                workspace: inactiveWorkspaceId,
                name: 'Inactive Delete Test',
                goal: 'Testing inactive member denied',
                createdBy: ownerUserId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${inactiveWorkspaceId}/agents/${agentId}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("You don't have permission to delete agents");
        });

        it('should return 403 for user with no TeamMember record and not workspace creator', async () => {
            // Create workspace owned by someone else (no TeamMember record for our user)
            const noAccessWorkspaceId = new mongoose.Types.ObjectId();
            const ownerUserId = new mongoose.Types.ObjectId();

            await Project.create({
                _id: noAccessWorkspaceId,
                name: 'No Access Workspace',
                userId: ownerUserId,
            });

            const agent = await Agent.create({
                workspace: noAccessWorkspaceId,
                name: 'No Access Delete Test',
                goal: 'Testing no access denied',
                createdBy: ownerUserId,
                status: 'Draft',
            });
            agentId = agent._id as mongoose.Types.ObjectId;

            const res = await request(app)
                .delete(`/api/workspaces/${noAccessWorkspaceId}/agents/${agentId}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe("You don't have permission to delete agents");
        });
    });
});
