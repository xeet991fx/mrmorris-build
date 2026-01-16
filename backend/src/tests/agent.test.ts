// @ts-ignore
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

/**
 * Agent Builder - Story 1.2 Test Suite
 * Tests for Add Trigger Configuration functionality
 */
describe('Agent Builder - Story 1.2: Add Trigger Configuration', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let agentId: string;

  beforeAll(async () => {
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

    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
    });
    userId = user._id.toString();

    // Create workspace
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

    // Generate mock auth token
    authToken = 'mock-jwt-token-user1';

    // Create a test agent
    const agent = await Agent.create({
      workspace: workspaceId,
      name: 'Test Agent',
      goal: 'Test goal',
      createdBy: userId,
      status: 'Draft',
    });
    agentId = agent._id.toString();
  });

  afterAll(async () => {
    await Agent.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Manual Trigger Configuration', () => {
    it('should add manual trigger to agent', async () => {
      const updateData = {
        triggers: [
          {
            type: 'manual',
            config: {},
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers).toHaveLength(1);
      expect(response.body.agent.triggers[0].type).toBe('manual');
      expect(response.body.agent.triggers[0].enabled).toBe(true);
    });
  });

  describe('Scheduled Trigger Configuration', () => {
    it('should add daily scheduled trigger', async () => {
      const updateData = {
        triggers: [
          {
            type: 'scheduled',
            config: {
              frequency: 'daily',
              time: '09:00',
            },
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers).toHaveLength(1);
      expect(response.body.agent.triggers[0].type).toBe('scheduled');
      expect(response.body.agent.triggers[0].config.frequency).toBe('daily');
      expect(response.body.agent.triggers[0].config.time).toBe('09:00');
    });

    it('should add weekly scheduled trigger with days', async () => {
      const updateData = {
        triggers: [
          {
            type: 'scheduled',
            config: {
              frequency: 'weekly',
              time: '14:30',
              days: [1, 3, 5], // Monday, Wednesday, Friday
            },
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers[0].config.frequency).toBe('weekly');
      expect(response.body.agent.triggers[0].config.days).toEqual([1, 3, 5]);
    });

    it('should add monthly scheduled trigger with date', async () => {
      const updateData = {
        triggers: [
          {
            type: 'scheduled',
            config: {
              frequency: 'monthly',
              time: '08:00',
              date: 1, // First day of month
            },
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers[0].config.frequency).toBe('monthly');
      expect(response.body.agent.triggers[0].config.date).toBe(1);
    });

    it('should reject scheduled trigger with invalid time format', async () => {
      const updateData = {
        triggers: [
          {
            type: 'scheduled',
            config: {
              frequency: 'daily',
              time: '9:00', // Invalid - should be 09:00
            },
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weekly trigger without days', async () => {
      const updateData = {
        triggers: [
          {
            type: 'scheduled',
            config: {
              frequency: 'weekly',
              time: '09:00',
              // Missing days array
            },
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject monthly trigger without date', async () => {
      const updateData = {
        triggers: [
          {
            type: 'scheduled',
            config: {
              frequency: 'monthly',
              time: '09:00',
              // Missing date
            },
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Event Trigger Configuration', () => {
    it('should add event trigger without conditions', async () => {
      const updateData = {
        triggers: [
          {
            type: 'event',
            config: {
              event: 'contact.created',
            },
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers[0].type).toBe('event');
      expect(response.body.agent.triggers[0].config.event).toBe('contact.created');
    });

    it('should add event trigger with conditions', async () => {
      const updateData = {
        triggers: [
          {
            type: 'event',
            config: {
              event: 'deal.stage_updated',
              conditions: [
                {
                  field: 'value',
                  operator: '>',
                  value: 10000,
                },
              ],
            },
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers[0].config.event).toBe('deal.stage_updated');
      expect(response.body.agent.triggers[0].config.conditions).toHaveLength(1);
      expect(response.body.agent.triggers[0].config.conditions[0].field).toBe('value');
      expect(response.body.agent.triggers[0].config.conditions[0].operator).toBe('>');
      expect(response.body.agent.triggers[0].config.conditions[0].value).toBe(10000);
    });
  });

  describe('Multiple Triggers', () => {
    it('should support multiple triggers on same agent', async () => {
      const updateData = {
        triggers: [
          {
            type: 'manual',
            config: {},
            enabled: true,
          },
          {
            type: 'scheduled',
            config: {
              frequency: 'daily',
              time: '09:00',
            },
            enabled: true,
          },
          {
            type: 'event',
            config: {
              event: 'contact.created',
            },
            enabled: false,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.triggers).toHaveLength(3);
      expect(response.body.agent.triggers[0].type).toBe('manual');
      expect(response.body.agent.triggers[1].type).toBe('scheduled');
      expect(response.body.agent.triggers[2].type).toBe('event');
      expect(response.body.agent.triggers[2].enabled).toBe(false);
    });
  });

  describe('Trigger Validation', () => {
    it('should reject empty triggers array', async () => {
      const updateData = {
        triggers: [],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid trigger type', async () => {
      const updateData = {
        triggers: [
          {
            type: 'invalid_type',
            config: {},
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

/**
 * Agent Builder - Story 1.3 Test Suite
 * Tests for Write Natural Language Instructions functionality
 */
describe('Agent Builder - Story 1.3: Write Natural Language Instructions', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let agentId: string;

  beforeAll(async () => {
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

    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
    });
    userId = user._id.toString();

    // Create workspace
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

    // Generate mock auth token
    authToken = 'mock-jwt-token-user1';

    // Create a test agent with triggers
    const agent = await Agent.create({
      workspace: workspaceId,
      name: 'Test Agent',
      goal: 'Test goal for instructions',
      createdBy: userId,
      status: 'Draft',
      triggers: [{ type: 'manual', config: {}, enabled: true }],
    });
    agentId = agent._id.toString();
  });

  afterAll(async () => {
    await Agent.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Instructions CRUD Operations', () => {
    it('[P0] should update agent with instructions', async () => {
      const updateData = {
        instructions: 'Send email to all contacts tagged "hot lead" using template "Sales Outreach"',
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe(updateData.instructions);

      // Verify persisted in database
      const savedAgent = await Agent.findOne({ _id: agentId, workspace: workspaceId });
      expect(savedAgent?.instructions).toBe(updateData.instructions);
    });

    it('[P0] should preserve line breaks in multi-step instructions', async () => {
      const multiLineInstructions = `1. Find contacts where title contains "CEO"
2. Filter for SaaS industry companies
3. Send personalized email using template "Outbound v2"
4. Wait 5 days
5. If no reply, send follow-up email`;

      const updateData = {
        instructions: multiLineInstructions,
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe(multiLineInstructions);

      // Verify line breaks preserved
      expect(response.body.agent.instructions.split('\n')).toHaveLength(5);
    });

    it('[P1] should retrieve agent with instructions', async () => {
      // First, set instructions
      await Agent.findOneAndUpdate(
        { _id: agentId, workspace: workspaceId },
        { instructions: 'Test instructions for retrieval' }
      );

      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe('Test instructions for retrieval');
    });

    it('[P1] should return null for agent without instructions', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBeNull();
    });

    it('[P1] should update instructions without affecting other fields', async () => {
      // Set initial trigger
      await Agent.findOneAndUpdate(
        { _id: agentId, workspace: workspaceId },
        { triggers: [{ type: 'manual', config: {}, enabled: true }] }
      );

      // Update only instructions
      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: 'New instructions' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe('New instructions');
      expect(response.body.agent.triggers).toHaveLength(1);
      expect(response.body.agent.name).toBe('Test Agent');
    });

    it('[P1] should clear instructions when set to empty string', async () => {
      // First set instructions
      await Agent.findOneAndUpdate(
        { _id: agentId, workspace: workspaceId },
        { instructions: 'Some instructions' }
      );

      // Clear instructions
      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: '' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe('');
    });
  });

  describe('Instructions Character Limits', () => {
    it('[P1] should accept instructions at exactly 10,000 characters', async () => {
      const maxLengthInstructions = 'A'.repeat(10000);

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: maxLengthInstructions })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toHaveLength(10000);
    });

    it('[P0] should reject instructions over 10,000 characters', async () => {
      const tooLongInstructions = 'A'.repeat(10001);

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: tooLongInstructions })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('[P2] should accept instructions at warning threshold (8,000 characters)', async () => {
      const warningThresholdInstructions = 'A'.repeat(8000);

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: warningThresholdInstructions })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toHaveLength(8000);
    });

    it('[P2] should accept instructions between warning and max (8001-9999 characters)', async () => {
      const betweenThresholdInstructions = 'A'.repeat(9500);

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: betweenThresholdInstructions })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toHaveLength(9500);
    });
  });

  describe('Instructions Whitespace Handling', () => {
    it('[P2] should trim leading and trailing whitespace', async () => {
      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: '  Send email to CEOs  ' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe('Send email to CEOs');
    });

    it('[P2] should preserve internal whitespace and formatting', async () => {
      const formattedInstructions = `Step 1: Review contact
Step 2: Send email

Notes:
  - Include personalization
  - Use friendly tone`;

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: formattedInstructions })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Internal newlines and spaces should be preserved
      expect(response.body.agent.instructions).toContain('\n\n');
      expect(response.body.agent.instructions).toContain('  - Include');
    });
  });

  describe('Instructions with Special Characters', () => {
    it('[P1] should handle instructions with quotes', async () => {
      const instructionsWithQuotes = 'Send email using template "Outbound v2" to contacts tagged \'hot lead\'';

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: instructionsWithQuotes })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe(instructionsWithQuotes);
    });

    it('[P1] should handle instructions with special characters', async () => {
      const instructionsWithSpecialChars = 'If deal value > $50,000 && status != "closed", assign to @senior_rep';

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: instructionsWithSpecialChars })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe(instructionsWithSpecialChars);
    });

    it('[P2] should handle instructions with unicode characters', async () => {
      const instructionsWithUnicode = 'Send 📧 to contacts in 日本 with greeting "こんにちは"';

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: instructionsWithUnicode })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe(instructionsWithUnicode);
    });
  });

  describe('Instructions with Triggers (Combined Updates)', () => {
    it('[P1] should update both instructions and triggers in single request', async () => {
      const updateData = {
        instructions: 'Send welcome email to new contacts',
        triggers: [
          {
            type: 'event',
            config: { event: 'contact.created' },
            enabled: true,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/workspaces/${workspaceId}/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.instructions).toBe('Send welcome email to new contacts');
      expect(response.body.agent.triggers).toHaveLength(1);
      expect(response.body.agent.triggers[0].config.event).toBe('contact.created');
    });
  });

  describe('Workspace Isolation for Instructions', () => {
    let otherWorkspaceId: string;
    let otherAgentId: string;

    beforeEach(async () => {
      // Create another workspace and agent
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'hashedpassword456',
      });

      const otherWorkspace = await Project.create({
        name: 'Other Workspace',
        owner: otherUser._id,
      });
      otherWorkspaceId = otherWorkspace._id.toString();

      await TeamMember.create({
        workspace: otherWorkspaceId,
        user: otherUser._id,
        role: 'owner',
      });

      const otherAgent = await Agent.create({
        workspace: otherWorkspaceId,
        name: 'Other Agent',
        goal: 'Other goal',
        createdBy: otherUser._id,
        status: 'Draft',
        instructions: 'Secret instructions from other workspace',
      });
      otherAgentId = otherAgent._id.toString();
    });

    it('[P0] should prevent updating instructions on another workspace agent', async () => {
      const response = await request(app)
        .put(`/api/workspaces/${otherWorkspaceId}/agents/${otherAgentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ instructions: 'Malicious update attempt' })
        .expect(403);

      expect(response.body.error).toContain('Access denied');

      // Verify original instructions unchanged
      const agent = await Agent.findById(otherAgentId);
      expect(agent?.instructions).toBe('Secret instructions from other workspace');
    });
  });
});
