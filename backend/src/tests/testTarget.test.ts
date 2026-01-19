// @ts-ignore
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';
import Company from '../models/Company';
import User from '../models/User';
import Project from '../models/Project';
import TeamMember from '../models/TeamMember';
import Pipeline from '../models/Pipeline';

/**
 * Story 2.2: Select Test Target - Test Suite
 * Tests for test target search endpoints (contacts and deals/opportunities)
 */
describe('Story 2.2: Select Test Target - Search Endpoints', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let companyId: string;
  let pipelineId: string;
  let stageId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || '');
    }
  });

  beforeEach(async () => {
    // Clear test data
    await Contact.deleteMany({});
    await Opportunity.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await Pipeline.deleteMany({});

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
      userId: userId,
    });
    workspaceId = workspace._id.toString();

    // Add user to workspace as owner
    await TeamMember.create({
      workspaceId: workspaceId,
      userId: userId,
      role: 'owner',
      status: 'active',
    });

    // Create a company for testing
    const company = await Company.create({
      workspaceId: workspaceId,
      userId: userId,
      name: 'Acme Corp',
    });
    companyId = company._id.toString();

    // Create a pipeline for opportunities
    stageId = new mongoose.Types.ObjectId();
    const pipeline = await Pipeline.create({
      workspaceId: workspaceId,
      userId: userId,
      name: 'Sales Pipeline',
      stages: [{ _id: stageId, name: 'Qualification', order: 1 }],
    });
    pipelineId = pipeline._id.toString();

    // Generate mock auth token
    authToken = 'mock-jwt-token-user1';
  });

  afterAll(async () => {
    await Contact.deleteMany({});
    await Opportunity.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await Pipeline.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/workspaces/:workspaceId/test-targets/contacts', () => {
    beforeEach(async () => {
      // Create test contacts
      await Contact.create([
        {
          workspaceId: workspaceId,
          userId: userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@acme.com',
          company: 'Acme Corp',
          companyId: companyId,
        },
        {
          workspaceId: workspaceId,
          userId: userId,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@techcorp.com',
          company: 'TechCorp',
        },
        {
          workspaceId: workspaceId,
          userId: userId,
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob@acme.com',
          company: 'Acme Corp',
          companyId: companyId,
        },
      ]);
    });

    it('should return contacts for workspace without search', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toBeDefined();
      expect(response.body.targets).toHaveLength(3);
      expect(response.body.targets[0]).toHaveProperty('id');
      expect(response.body.targets[0]).toHaveProperty('name');
      expect(response.body.targets[0]).toHaveProperty('subtitle');
    });

    it('should return contacts matching search by firstName', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?search=John`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(1);
      expect(response.body.targets[0].name).toContain('John');
    });

    it('should return contacts matching search by email', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?search=jane@techcorp`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(1);
      expect(response.body.targets[0].subtitle).toBe('jane@techcorp.com');
    });

    it('should return contacts matching search by company', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?search=Acme`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?limit=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(2);
      expect(response.body.hasMore).toBe(true);
    });

    it('should return hasMore=false when all results returned', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?limit=50`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(3);
      expect(response.body.hasMore).toBe(false);
    });

    it('should respect workspace isolation', async () => {
      // Create another workspace with contacts
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'hashedpassword456',
      });
      const otherWorkspace = await Project.create({
        name: 'Other Workspace',
        userId: otherUser._id,
      });
      await Contact.create({
        workspaceId: otherWorkspace._id,
        userId: otherUser._id,
        firstName: 'Other',
        lastName: 'Contact',
        email: 'other@other.com',
      });

      // Query original workspace - should only see 3 contacts
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.targets).toHaveLength(3);
      // Verify none of them are from the other workspace
      response.body.targets.forEach((target: any) => {
        expect(target.name).not.toContain('Other');
      });
    });

    it('should return minimal data for selection', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const target = response.body.targets[0];
      // Should have only selection fields
      expect(target).toHaveProperty('id');
      expect(target).toHaveProperty('name');
      expect(target).toHaveProperty('subtitle');
      expect(target).toHaveProperty('company');
      // Should NOT have sensitive/unnecessary fields
      expect(target).not.toHaveProperty('customFields');
      expect(target).not.toHaveProperty('aiInsights');
      expect(target).not.toHaveProperty('notes');
    });

    it('should handle case-insensitive search', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?search=JOHN`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts?search=nonexistent`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toEqual([]);
      expect(response.body.hasMore).toBe(false);
    });
  });

  describe('GET /api/workspaces/:workspaceId/test-targets/deals', () => {
    beforeEach(async () => {
      // Create test opportunities (deals)
      await Opportunity.create([
        {
          workspaceId: workspaceId,
          userId: userId,
          pipelineId: pipelineId,
          stageId: stageId,
          title: 'Enterprise Deal',
          value: 50000,
          currency: 'USD',
          companyId: companyId,
          status: 'open',
        },
        {
          workspaceId: workspaceId,
          userId: userId,
          pipelineId: pipelineId,
          stageId: stageId,
          title: 'Small Business Package',
          value: 5000,
          currency: 'USD',
          status: 'open',
        },
        {
          workspaceId: workspaceId,
          userId: userId,
          pipelineId: pipelineId,
          stageId: stageId,
          title: 'Acme Corp Expansion',
          value: 100000,
          currency: 'USD',
          companyId: companyId,
          status: 'open',
        },
      ]);
    });

    it('should return deals for workspace without search', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toBeDefined();
      expect(response.body.targets).toHaveLength(3);
      expect(response.body.targets[0]).toHaveProperty('id');
      expect(response.body.targets[0]).toHaveProperty('name');
      expect(response.body.targets[0]).toHaveProperty('subtitle');
    });

    it('should return deals matching search by title', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals?search=Enterprise`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(1);
      expect(response.body.targets[0].name).toBe('Enterprise Deal');
    });

    it('should return deals matching search by company', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals?search=Acme`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(1);
      expect(response.body.targets[0].name).toBe('Acme Corp Expansion');
    });

    it('should include formatted value in subtitle', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals?search=Enterprise`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets[0].subtitle).toContain('50,000');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals?limit=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(2);
      expect(response.body.hasMore).toBe(true);
    });

    it('should respect workspace isolation', async () => {
      // Create another workspace with deals
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'hashedpassword456',
      });
      const otherWorkspace = await Project.create({
        name: 'Other Workspace',
        userId: otherUser._id,
      });
      const otherPipeline = await Pipeline.create({
        workspaceId: otherWorkspace._id,
        userId: otherUser._id,
        name: 'Other Pipeline',
        stages: [{ _id: new mongoose.Types.ObjectId(), name: 'Stage', order: 1 }],
      });
      await Opportunity.create({
        workspaceId: otherWorkspace._id,
        userId: otherUser._id,
        pipelineId: otherPipeline._id,
        stageId: otherPipeline.stages[0]._id,
        title: 'Other Deal',
        value: 10000,
        status: 'open',
      });

      // Query original workspace - should only see 3 deals
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.targets).toHaveLength(3);
      response.body.targets.forEach((target: any) => {
        expect(target.name).not.toBe('Other Deal');
      });
    });

    it('should populate company name', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals?search=Acme Corp Expansion`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targets).toHaveLength(1);
      expect(response.body.targets[0].company).toBe('Acme Corp');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication for contacts', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/contacts`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject requests without authentication for deals', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${workspaceId}/test-targets/deals`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject requests for workspace user is not a member of', async () => {
      const otherWorkspace = await Project.create({
        name: 'Other Workspace',
        userId: new mongoose.Types.ObjectId(),
      });

      const response = await request(app)
        .get(`/api/workspaces/${otherWorkspace._id}/test-targets/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Access denied');
    });
  });
});

/**
 * Story 2.2: TestModeService Context Resolution Tests
 * Tests for test target selection with variable resolution
 */
describe('Story 2.2: TestModeService Context Resolution', () => {
  let userId: string;
  let workspaceId: string;
  let agentId: string;
  let contactId: string;
  let dealId: string;
  let companyId: string;
  let pipelineId: string;
  let stageId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || '');
    }
  });

  beforeEach(async () => {
    // Import Agent model dynamically to avoid circular dependency
    const Agent = (await import('../models/Agent')).default;

    // Clear test data
    await Contact.deleteMany({});
    await Opportunity.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await Pipeline.deleteMany({});
    await Agent.deleteMany({});

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
      userId: userId,
    });
    workspaceId = workspace._id.toString();

    // Add user to workspace as owner
    await TeamMember.create({
      workspaceId: workspaceId,
      userId: userId,
      role: 'owner',
      status: 'active',
    });

    // Create a company for testing
    const company = await Company.create({
      workspaceId: workspaceId,
      userId: userId,
      name: 'Acme Corp',
    });
    companyId = company._id.toString();

    // Create a pipeline for opportunities
    stageId = new mongoose.Types.ObjectId();
    const pipeline = await Pipeline.create({
      workspaceId: workspaceId,
      userId: userId,
      name: 'Sales Pipeline',
      stages: [{ _id: stageId, name: 'Qualification', order: 1 }],
    });
    pipelineId = pipeline._id.toString();

    // Create test contact
    const contact = await Contact.create({
      workspaceId: workspaceId,
      userId: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@acme.com',
      company: 'Acme Corp',
      companyId: companyId,
      jobTitle: 'CEO',
      phone: '+1 555 123 4567',
    });
    contactId = contact._id.toString();

    // Create test deal
    const deal = await Opportunity.create({
      workspaceId: workspaceId,
      userId: userId,
      pipelineId: pipelineId,
      stageId: stageId,
      title: 'Enterprise Deal',
      value: 50000,
      currency: 'USD',
      companyId: companyId,
      contactId: contactId,
      status: 'open',
    });
    dealId = deal._id.toString();

    // Create test agent with instructions using @contact and @deal variables
    const agent = await Agent.create({
      workspace: workspaceId,
      name: 'Test Agent',
      goal: 'Test agent for context resolution',
      status: 'Draft',
      createdBy: userId,
      instructions: 'Send email to @contact.email about deal @deal.name worth @deal.value',
      parsedActions: [
        {
          type: 'send_email',
          to: '@contact.email',
          subject: 'Regarding @deal.name',
          body: 'Hi @contact.firstName, about the @deal.name deal worth $@deal.value...',
        },
      ],
    });
    agentId = agent._id.toString();
  });

  afterAll(async () => {
    const Agent = (await import('../models/Agent')).default;
    await Contact.deleteMany({});
    await Opportunity.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await Pipeline.deleteMany({});
    await Agent.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/workspaces/:workspaceId/agents/:agentId/test with testTarget', () => {
    it('should resolve @contact.* variables when contact target is provided', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents/${agentId}/test`)
        .set('Authorization', 'Bearer mock-jwt-token-user1')
        .send({
          testTarget: {
            type: 'contact',
            id: contactId,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.steps).toHaveLength(1);

      // Check that @contact.* variables were resolved
      const step = response.body.steps[0];
      expect(step.preview.details.to).toBe('john@acme.com');
      expect(step.preview.details.body).toContain('Hi John');
    });

    it('should resolve @deal.* variables when deal target is provided', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents/${agentId}/test`)
        .set('Authorization', 'Bearer mock-jwt-token-user1')
        .send({
          testTarget: {
            type: 'deal',
            id: dealId,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.steps).toHaveLength(1);

      // Check that @deal.* variables were resolved
      const step = response.body.steps[0];
      expect(step.preview.details.subject).toContain('Enterprise Deal');
      expect(step.preview.details.body).toContain('50000');
    });

    it('should use manual data when type is none with manualData', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents/${agentId}/test`)
        .set('Authorization', 'Bearer mock-jwt-token-user1')
        .send({
          testTarget: {
            type: 'none',
            manualData: {
              'contact.email': 'manual@test.com',
              'contact.firstName': 'Manual',
              'deal.name': 'Manual Deal',
              'deal.value': '99999',
            },
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.steps).toHaveLength(1);

      // Check that manual data was used
      const step = response.body.steps[0];
      expect(step.preview.details.to).toBe('manual@test.com');
      expect(step.preview.details.body).toContain('Hi Manual');
      expect(step.preview.details.body).toContain('Manual Deal');
    });

    it('should work without testTarget (backwards compatibility)', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents/${agentId}/test`)
        .set('Authorization', 'Bearer mock-jwt-token-user1')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.steps).toHaveLength(1);

      // Variables should remain as @contact.* placeholders
      const step = response.body.steps[0];
      expect(step.preview.details.to).toBe('@contact.email');
    });

    it('should validate testTarget schema - require id for contact type', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents/${agentId}/test`)
        .set('Authorization', 'Bearer mock-jwt-token-user1')
        .send({
          testTarget: {
            type: 'contact',
            // Missing id
          },
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate testTarget schema - require id for deal type', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/agents/${agentId}/test`)
        .set('Authorization', 'Bearer mock-jwt-token-user1')
        .send({
          testTarget: {
            type: 'deal',
            // Missing id
          },
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });
});
