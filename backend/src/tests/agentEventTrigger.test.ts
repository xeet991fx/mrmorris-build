import mongoose from 'mongoose';
import Agent from '../models/Agent';
import User from '../models/User';
import Project from '../models/Project';
import TeamMember from '../models/TeamMember';
import { AgentEventListenerService, IEventCondition } from '../services/AgentEventListenerService';

/**
 * Agent Event Trigger - Story 3.4 Test Suite
 * Tests for Event-Based Agent Execution
 */
describe('Agent Event Trigger - Story 3.4', () => {
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || '');
    }
  });

  beforeEach(async () => {
    // Clear test data
    await Agent.deleteMany({ workspace: new mongoose.Types.ObjectId() }).catch(() => {});
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});

    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'test-event@example.com',
      password: 'hashedpassword123',
    });
    userId = user._id.toString();

    // Create workspace
    const workspace = await Project.create({
      name: 'Event Test Workspace',
      owner: userId,
    });
    workspaceId = workspace._id.toString();

    // Add user to workspace
    await TeamMember.create({
      workspace: workspaceId,
      user: userId,
      role: 'owner',
    });
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Condition Evaluation (AC4)', () => {
    describe('equals operator', () => {
      it('should return true when values match exactly', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.status', operator: 'equals', value: 'lead' },
        ];
        const context = { contact: { status: 'lead' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when values do not match', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.status', operator: 'equals', value: 'customer' },
        ];
        const context = { contact: { status: 'lead' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('not_equals operator', () => {
      it('should return true when values do not match', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.status', operator: 'not_equals', value: 'customer' },
        ];
        const context = { contact: { status: 'lead' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when values match', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.status', operator: 'not_equals', value: 'lead' },
        ];
        const context = { contact: { status: 'lead' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('greater_than operator', () => {
      it('should return true when field value is greater', () => {
        const conditions: IEventCondition[] = [
          { field: 'deal.value', operator: 'greater_than', value: 5000 },
        ];
        const context = { deal: { value: 10000 } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when field value is less or equal', () => {
        const conditions: IEventCondition[] = [
          { field: 'deal.value', operator: 'greater_than', value: 10000 },
        ];
        const context = { deal: { value: 5000 } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('less_than operator', () => {
      it('should return true when field value is less', () => {
        const conditions: IEventCondition[] = [
          { field: 'deal.value', operator: 'less_than', value: 10000 },
        ];
        const context = { deal: { value: 5000 } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when field value is greater or equal', () => {
        const conditions: IEventCondition[] = [
          { field: 'deal.value', operator: 'less_than', value: 5000 },
        ];
        const context = { deal: { value: 10000 } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should return true when string contains substring (case insensitive)', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.email', operator: 'contains', value: 'gmail' },
        ];
        const context = { contact: { email: 'user@Gmail.com' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when string does not contain substring', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.email', operator: 'contains', value: 'yahoo' },
        ];
        const context = { contact: { email: 'user@gmail.com' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('not_contains operator', () => {
      it('should return true when string does not contain substring', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.email', operator: 'not_contains', value: 'competitor.com' },
        ];
        const context = { contact: { email: 'user@gmail.com' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when string contains substring', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.email', operator: 'not_contains', value: 'gmail' },
        ];
        const context = { contact: { email: 'user@gmail.com' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('exists operator', () => {
      it('should return true when field exists and is not null', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.phone', operator: 'exists', value: null },
        ];
        const context = { contact: { phone: '555-1234' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when field is undefined', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.phone', operator: 'exists', value: null },
        ];
        const context = { contact: { email: 'test@test.com' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });

      it('should return false when field is null', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.phone', operator: 'exists', value: null },
        ];
        const context = { contact: { phone: null } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('not_exists operator', () => {
      it('should return true when field is undefined', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.phone', operator: 'not_exists', value: null },
        ];
        const context = { contact: { email: 'test@test.com' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return true when field is null', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.phone', operator: 'not_exists', value: null },
        ];
        const context = { contact: { phone: null } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when field exists', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.phone', operator: 'not_exists', value: null },
        ];
        const context = { contact: { phone: '555-1234' } };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('Multiple conditions (AND logic)', () => {
      it('should return true when all conditions match', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.status', operator: 'equals', value: 'lead' },
          { field: 'deal.value', operator: 'greater_than', value: 5000 },
          { field: 'contact.email', operator: 'not_contains', value: 'competitor.com' },
        ];
        const context = {
          contact: { status: 'lead', email: 'user@gmail.com' },
          deal: { value: 10000 },
        };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });

      it('should return false when any condition fails', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.status', operator: 'equals', value: 'lead' },
          { field: 'deal.value', operator: 'greater_than', value: 15000 }, // This fails
          { field: 'contact.email', operator: 'not_contains', value: 'competitor.com' },
        ];
        const context = {
          contact: { status: 'lead', email: 'user@gmail.com' },
          deal: { value: 10000 },
        };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(false);
      });
    });

    describe('Empty conditions', () => {
      it('should return true when no conditions are specified', () => {
        const result = AgentEventListenerService.evaluateConditions([], {});
        expect(result).toBe(true);
      });
    });

    describe('Nested field access', () => {
      it('should access deeply nested fields', () => {
        const conditions: IEventCondition[] = [
          { field: 'contact.company.industry', operator: 'equals', value: 'Technology' },
        ];
        const context = {
          contact: {
            company: {
              industry: 'Technology',
            },
          },
        };

        const result = AgentEventListenerService.evaluateConditions(conditions, context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Find Matching Agents (AC5)', () => {
    beforeEach(async () => {
      // Clean agents for this workspace
      await Agent.deleteMany({ workspace: new mongoose.Types.ObjectId(workspaceId) });
    });

    it('should find Live agents with matching event triggers', async () => {
      // Create a Live agent with contact_created trigger
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Welcome Agent',
        goal: 'Welcome new contacts',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      const matchingAgents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );

      expect(matchingAgents).toHaveLength(1);
      expect(matchingAgents[0].name).toBe('Welcome Agent');
    });

    it('should not find agents with different event types', async () => {
      // Create agent with deal_stage_updated trigger
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Deal Stage Agent',
        goal: 'Handle deal stage changes',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'deal_stage_updated' },
            enabled: true,
          },
        ],
      });

      const matchingAgents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );

      expect(matchingAgents).toHaveLength(0);
    });

    it('should not find Draft or Paused agents', async () => {
      // Create Draft agent
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Draft Agent',
        goal: 'Draft agent',
        status: 'Draft',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      // Create Paused agent
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Paused Agent',
        goal: 'Paused agent',
        status: 'Paused',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      const matchingAgents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );

      expect(matchingAgents).toHaveLength(0);
    });

    it('should not find agents with disabled triggers', async () => {
      // Create agent with disabled trigger
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Disabled Trigger Agent',
        goal: 'Agent with disabled trigger',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: false,
          },
        ],
      });

      const matchingAgents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );

      expect(matchingAgents).toHaveLength(0);
    });

    it('should find multiple agents matching the same event (AC5: Parallel execution)', async () => {
      // Create multiple Live agents with same trigger
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Agent A',
        goal: 'First agent',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Agent B',
        goal: 'Second agent',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Agent C',
        goal: 'Third agent',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      const matchingAgents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );

      expect(matchingAgents).toHaveLength(3);
    });

    it('should only find agents in the specified workspace (AC3: Workspace isolation)', async () => {
      // Create another workspace
      const otherWorkspace = await Project.create({
        name: 'Other Workspace',
        owner: userId,
      });
      const otherWorkspaceId = otherWorkspace._id.toString();

      // Create agent in other workspace
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(otherWorkspaceId),
        name: 'Other Workspace Agent',
        goal: 'Agent in different workspace',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      // Create agent in our workspace
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Our Workspace Agent',
        goal: 'Agent in our workspace',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      const matchingAgents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );

      expect(matchingAgents).toHaveLength(1);
      expect(matchingAgents[0].name).toBe('Our Workspace Agent');

      // Cleanup
      await Agent.deleteMany({ workspace: new mongoose.Types.ObjectId(otherWorkspaceId) });
      await Project.findByIdAndDelete(otherWorkspaceId);
    });
  });

  describe('Event Types (AC1, AC2)', () => {
    it('should support contact_created event type', async () => {
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Contact Created Agent',
        goal: 'Handle contact created',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'contact_created' },
            enabled: true,
          },
        ],
      });

      const agents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'contact_created'
      );
      expect(agents).toHaveLength(1);
    });

    it('should support deal_stage_updated event type', async () => {
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Deal Stage Agent',
        goal: 'Handle deal stage changes',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'deal_stage_updated' },
            enabled: true,
          },
        ],
      });

      const agents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'deal_stage_updated'
      );
      expect(agents).toHaveLength(1);
    });

    it('should support form_submitted event type', async () => {
      await Agent.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        name: 'Form Agent',
        goal: 'Handle form submissions',
        status: 'Live',
        createdBy: new mongoose.Types.ObjectId(userId),
        triggers: [
          {
            type: 'event',
            config: { eventType: 'form_submitted' },
            enabled: true,
          },
        ],
      });

      const agents = await AgentEventListenerService.findMatchingAgents(
        workspaceId,
        'form_submitted'
      );
      expect(agents).toHaveLength(1);
    });
  });
});
