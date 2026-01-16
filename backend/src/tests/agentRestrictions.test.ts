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

describe('Agent Restrictions API', () => {
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

        // Setup test data
        userId = new mongoose.Types.ObjectId();
        workspaceId = new mongoose.Types.ObjectId();

        // Create test agent
        const agent = await Agent.create({
            workspace: workspaceId,
            name: 'Test Agent',
            goal: 'Testing restrictions',
            createdBy: userId,
            status: 'Draft',
            restrictions: null // Start with no restrictions
        });
        agentId = agent._id as mongoose.Types.ObjectId;

        // Mock user in request for future calls (if needed beyond the mock middleware)
    });

    it('should apply default restrictions when none are provided', async () => {
        // Manually trigger default application via update if needed, 
        // but schema default should handle it on creation if we didn't force null above.
        // Actually, let's test the controller logic which merges defaults.

        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                // Sending empty restrictions object to trigger merge logic
                restrictions: {}
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.agent.restrictions).toBeDefined();
        expect(res.body.agent.restrictions.maxExecutionsPerDay).toBe(100);
        expect(res.body.agent.restrictions.maxEmailsPerDay).toBe(100);
        expect(res.body.agent.restrictions.allowedIntegrations).toEqual([]);
    });

    it('should update agent with valid restrictions', async () => {
        const newRestrictions = {
            maxExecutionsPerDay: 50,
            maxEmailsPerDay: 20,
            allowedIntegrations: ['gmail', 'slack'],
            excludedDomains: ['competitor.com']
        };

        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: newRestrictions });

        expect(res.status).toBe(200);
        expect(res.body.agent.restrictions.maxExecutionsPerDay).toBe(50);
        expect(res.body.agent.restrictions.maxEmailsPerDay).toBe(20);
        expect(res.body.agent.restrictions.allowedIntegrations).toHaveLength(2);
        expect(res.body.agent.restrictions.allowedIntegrations).toContain('gmail');
        expect(res.body.agent.restrictions.excludedDomains).toContain('competitor.com');
    });

    it('should validate maxExecutionsPerDay bounds', async () => {
        // Too low
        const resLow = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { maxExecutionsPerDay: 0 } });

        expect(resLow.status).toBe(400);

        // Too high
        const resHigh = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { maxExecutionsPerDay: 1001 } });

        expect(resHigh.status).toBe(400);
    });

    it('should validate maxEmailsPerDay bounds', async () => {
        // Too low
        const resLow = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { maxEmailsPerDay: 0 } });

        expect(resLow.status).toBe(400);

        // Too high
        const resHigh = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { maxEmailsPerDay: 501 } });

        expect(resHigh.status).toBe(400);
    });

    it('should validate allowed integrations', async () => {
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { allowedIntegrations: ['invalid-integration'] } });

        expect(res.status).toBe(400);
    });

    it('should merge partial restrictions with existing values', async () => {
        // First set some values
        await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                restrictions: {
                    maxExecutionsPerDay: 50,
                    allowedIntegrations: ['gmail']
                }
            });

        // Update different field
        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({
                restrictions: {
                    maxEmailsPerDay: 25
                }
            });

        // Verify merge
        expect(res.body.agent.restrictions.maxExecutionsPerDay).toBe(50); // Should remain
        expect(res.body.agent.restrictions.maxEmailsPerDay).toBe(25); // Should update
        expect(res.body.agent.restrictions.allowedIntegrations).toContain('gmail'); // Should remain
    });

    it('should save and retrieve guardrails text', async () => {
        const guardrailsText = 'Never contact anyone at competitor.com\nWait 48 hours between follow-ups';

        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { guardrails: guardrailsText } });

        expect(res.status).toBe(200);
        expect(res.body.agent.restrictions.guardrails).toBe(guardrailsText);
    });

    it('should validate guardrails max length', async () => {
        // Create a string over 5000 characters
        const tooLongGuardrails = 'x'.repeat(5001);

        const res = await request(app)
            .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
            .send({ restrictions: { guardrails: tooLongGuardrails } });

        expect(res.status).toBe(400);
    });
});
