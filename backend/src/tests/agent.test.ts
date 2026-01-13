import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server';
import Agent from '../models/Agent';
import User from '../models/User';
import Project from '../models/Project';
import TeamMember from '../models/TeamMember';

/**
 * Agent Builder - Story 1.1 Test Suite
 * Tests for Create Basic Agent functionality
 */
describe('Agent Builder - Story 1.1: Create Basic Agent', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let otherUserId: string;
  let otherWorkspaceId: string;
  let otherAuthToken: string;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || '');
    }
  });

  beforeEach(async () => {
    // Clear test data
    await Agent.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});

    // Create test user 1
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
    });
    userId = user._id.toString();

    // Create workspace 1
    const workspace = await Project.create({
      name: 'Test Workspace',
      owner: userId,
    });
    workspaceId = workspace._id.toString();

    // Add user to workspace
    await TeamMember.create({
      workspace: workspaceId,
      user: userId,
      role: 'owner',
    });

    // Generate mock auth token for user 1
    authToken = 'mock-jwt-token-user1';

    // Create test user 2 (for workspace isolation tests)
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: 'hashedpassword456',
    });
    otherUserId = otherUser._id.toString();

    // Create workspace 2
    const otherWorkspace = await Project.create({
      name: 'Other Workspace',
      owner: otherUserId,
    });
    otherWorkspaceId = otherWorkspace._id.toString();

    // Add other user to their workspace
    await TeamMember.create({
      workspace: otherWorkspaceId,
      user: otherUserId,
      role: 'owner',
    });

    // Generate mock auth token for user 2
    otherAuthToken = 'mock-jwt-token-user2';
  });

  afterAll(async () => {
    // Clean up and close connection
    await Agent.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Agent Creation', () => {
    it('should create agent with valid data', async () => {
      const agentData = {
        name: 'Lead Follow-up Agent',
        goal: 'Automatically follow up with leads who haven\'t responded in 3 days',
      };

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe(agentData.name);
      expect(response.body.agent.goal).toBe(agentData.goal);
      expect(response.body.agent.status).toBe('Draft');
      expect(response.body.agent.workspace).toBe(workspaceId);
      expect(response.body.agent.createdBy).toBe(userId);
      expect(response.body.agent._id).toBeDefined();
      expect(response.body.agent.createdAt).toBeDefined();
      expect(response.body.agent.updatedAt).toBeDefined();

      // Verify agent was saved to database
      const savedAgent = await Agent.findById(response.body.agent._id);
      expect(savedAgent).toBeDefined();
      expect(savedAgent?.workspace.toString()).toBe(workspaceId);
    });

    it('should reject creation without name', async () => {
      const agentData = {
        goal: 'Follow up with leads',
      };

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });

    it('should reject creation without goal', async () => {
      const agentData = {
        name: 'Lead Follow-up Agent',
      };

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation');
    });

    it('should enforce workspace isolation on creation', async () => {
      const agentData = {
        name: 'Test Agent',
        goal: 'Test goal',
      };

      // User 1 tries to create agent in User 2's workspace
      const response = await request(app)
        .post(`/api/workspaces/${otherWorkspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    it('should enforce max length constraints', async () => {
      // Test name > 100 characters
      const longName = 'A'.repeat(101);
      const response1 = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: longName,
          goal: 'Valid goal',
        })
        .expect(400);

      expect(response1.body.success).toBe(false);

      // Test goal > 500 characters
      const longGoal = 'A'.repeat(501);
      const response2 = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Valid name',
          goal: longGoal,
        })
        .expect(400);

      expect(response2.body.success).toBe(false);
    });

    it('should trim whitespace from name', async () => {
      const agentData = {
        name: '  Lead Agent  ',
        goal: 'Follow up with leads',
      };

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(201);

      expect(response.body.agent.name).toBe('Lead Agent');
    });

    it('should always create agents with Draft status', async () => {
      const agentData = {
        name: 'Test Agent',
        goal: 'Test goal',
        status: 'Live', // Try to override (should be ignored)
      };

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(201);

      expect(response.body.agent.status).toBe('Draft');
    });
  });

  describe('Agent Listing', () => {
    it('should list all agents in a workspace', async () => {
      // Create multiple agents
      await Agent.create([
        {
          workspace: workspaceId,
          name: 'Agent 1',
          goal: 'Goal 1',
          createdBy: userId,
          status: 'Draft',
        },
        {
          workspace: workspaceId,
          name: 'Agent 2',
          goal: 'Goal 2',
          createdBy: userId,
          status: 'Live',
        },
        {
          workspace: workspaceId,
          name: 'Agent 3',
          goal: 'Goal 3',
          createdBy: userId,
          status: 'Paused',
        },
      ]);

      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents).toBeDefined();
      expect(response.body.agents).toHaveLength(3);
      expect(response.body.agents[0].name).toBe('Agent 3'); // Most recent first
    });

    it('should return empty array for workspace with no agents', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents).toEqual([]);
    });

    it('should enforce workspace isolation on listing', async () => {
      // Create agent in workspace 1
      await Agent.create({
        workspace: workspaceId,
        name: 'Agent in Workspace 1',
        goal: 'Goal 1',
        createdBy: userId,
        status: 'Draft',
      });

      // Create agent in workspace 2
      await Agent.create({
        workspace: otherWorkspaceId,
        name: 'Agent in Workspace 2',
        goal: 'Goal 2',
        createdBy: otherUserId,
        status: 'Draft',
      });

      // User 1 lists their agents - should only see workspace 1 agent
      const response1 = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.agents).toHaveLength(1);
      expect(response1.body.agents[0].name).toBe('Agent in Workspace 1');

      // User 2 lists their agents - should only see workspace 2 agent
      const response2 = await request(app)
        .get(`/api/workspaces/${otherWorkspaceId}/agents`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(200);

      expect(response2.body.agents).toHaveLength(1);
      expect(response2.body.agents[0].name).toBe('Agent in Workspace 2');
    });
  });

  describe('Agent Retrieval', () => {
    it('should retrieve agent by ID', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test Agent',
        goal: 'Test goal',
        createdBy: userId,
        status: 'Draft',
      });

      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents/${agent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent._id).toBe(agent._id.toString());
      expect(response.body.agent.name).toBe('Test Agent');
      expect(response.body.agent.goal).toBe('Test goal');

      // Verify future fields are present but empty/null
      expect(response.body.agent.triggers).toEqual([]);
      expect(response.body.agent.instructions).toBeNull();
      expect(response.body.agent.parsedActions).toEqual([]);
    });

    it('should return 404 for non-existent agent', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should prevent cross-workspace access on retrieval', async () => {
      // Create agent in workspace 2
      const agent = await Agent.create({
        workspace: otherWorkspaceId,
        name: 'Other Workspace Agent',
        goal: 'Other goal',
        createdBy: otherUserId,
        status: 'Draft',
      });

      // User 1 tries to access User 2's agent
      const response = await request(app)
        .get(`/api/workspaces/${otherWorkspaceId}/agents/${agent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });

    it('should return 404 if agent exists but workspace mismatch', async () => {
      // Create agent in workspace 1
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Workspace 1 Agent',
        goal: 'Goal',
        createdBy: userId,
        status: 'Draft',
      });

      // Try to access with wrong workspace ID
      const response = await request(app)
        .get(`/api/workspaces/${otherWorkspaceId}/agents/${agent._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents`)
        .send({ name: 'Test', goal: 'Test' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject requests with invalid workspace access', async () => {
      const agentData = {
        name: 'Test Agent',
        goal: 'Test goal',
      };

      // User tries to access workspace they're not a member of
      const response = await request(app)
        .post(`/api/workspaces/${otherWorkspaceId}/agents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentData)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Database Indexes', () => {
    it('should have compound indexes for performance', async () => {
      const indexes = await Agent.collection.getIndexes();

      // Check for compound indexes
      const workspaceStatusIndex = Object.keys(indexes).find(key =>
        key.includes('workspace') && key.includes('status')
      );
      const workspaceCreatedByIndex = Object.keys(indexes).find(key =>
        key.includes('workspace') && key.includes('createdBy')
      );
      const workspaceCreatedAtIndex = Object.keys(indexes).find(key =>
        key.includes('workspace') && key.includes('createdAt')
      );

      expect(workspaceStatusIndex).toBeDefined();
      expect(workspaceCreatedByIndex).toBeDefined();
      expect(workspaceCreatedAtIndex).toBeDefined();
    });
  });

  describe('Mongoose Middleware - Workspace Isolation', () => {
    it('should throw error when querying without workspace filter (find)', async () => {
      await expect(
        Agent.find({ status: 'Draft' })
      ).rejects.toThrow('SECURITY: Workspace filter required');
    });

    it('should throw error when querying without workspace filter (findOne)', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test',
        goal: 'Test',
        createdBy: userId,
        status: 'Draft',
      });

      await expect(
        Agent.findOne({ _id: agent._id })
      ).rejects.toThrow('SECURITY: Workspace filter required');
    });

    it('should allow queries with workspace filter', async () => {
      const agent = await Agent.create({
        workspace: workspaceId,
        name: 'Test',
        goal: 'Test',
        createdBy: userId,
        status: 'Draft',
      });

      // These should work
      const foundAgent1 = await Agent.findOne({
        _id: agent._id,
        workspace: workspaceId,
      });
      expect(foundAgent1).toBeDefined();

      const foundAgents = await Agent.find({ workspace: workspaceId });
      expect(foundAgents).toHaveLength(1);
    });
  });
});
