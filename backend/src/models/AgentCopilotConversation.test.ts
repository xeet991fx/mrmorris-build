import mongoose from 'mongoose';
import AgentCopilotConversation, { IAgentCopilotConversation } from './AgentCopilotConversation';

describe('AgentCopilotConversation Model', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mrmorris-test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AgentCopilotConversation.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create conversation with all required fields', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [
          {
            role: 'system',
            content: "Hi! I'm your AI Copilot. How can I help you build this agent?",
            timestamp: new Date(),
            creditsUsed: 0,
          },
        ],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const conversation = await AgentCopilotConversation.create(conversationData);

      expect(conversation).toBeDefined();
      expect(conversation.workspace).toEqual(conversationData.workspace);
      expect(conversation.agent).toEqual(conversationData.agent);
      expect(conversation.user).toEqual(conversationData.user);
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].role).toBe('system');
      expect(conversation.expiresAt).toBeDefined();
    });

    it('should fail without required workspace field', async () => {
      const conversationData = {
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [],
      };

      await expect(AgentCopilotConversation.create(conversationData)).rejects.toThrow();
    });

    it('should fail without required agent field', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [],
      };

      await expect(AgentCopilotConversation.create(conversationData)).rejects.toThrow();
    });

    it('should fail without required user field', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        messages: [],
      };

      await expect(AgentCopilotConversation.create(conversationData)).rejects.toThrow();
    });

    it('should validate role enum values', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [
          {
            role: 'invalid_role' as any,
            content: 'Test',
            timestamp: new Date(),
            creditsUsed: 0,
          },
        ],
      };

      await expect(AgentCopilotConversation.create(conversationData)).rejects.toThrow();
    });
  });

  describe('TTL Functionality', () => {
    it('should auto-set expiresAt to 7 days from createdAt', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [],
      };

      const conversation = await AgentCopilotConversation.create(conversationData);

      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const expectedExpiry = new Date(conversation.createdAt.getTime() + sevenDaysInMs);

      // Allow 1 second tolerance
      const timeDiff = Math.abs(conversation.expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('Indexes', () => {
    it('should have compound index on workspace, agent, user', async () => {
      const indexes = AgentCopilotConversation.schema.indexes();
      const compoundIndex = indexes.find(
        (idx: any) => idx[0].workspace === 1 && idx[0].agent === 1 && idx[0].user === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have TTL index on expiresAt', async () => {
      const indexes = AgentCopilotConversation.schema.indexes();
      const ttlIndex = indexes.find((idx: any) => idx[0].expiresAt === 1);
      expect(ttlIndex).toBeDefined();
      expect(ttlIndex[1].expireAfterSeconds).toBe(0);
    });
  });

  describe('Messages Array', () => {
    it('should store messages with all fields', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [
          {
            role: 'user',
            content: 'Help me create an agent',
            timestamp: new Date(),
            creditsUsed: 0,
          },
          {
            role: 'assistant',
            content: "I'd be happy to help!",
            timestamp: new Date(),
            creditsUsed: 1,
          },
        ],
      };

      const conversation = await AgentCopilotConversation.create(conversationData);

      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0].role).toBe('user');
      expect(conversation.messages[0].creditsUsed).toBe(0);
      expect(conversation.messages[1].role).toBe('assistant');
      expect(conversation.messages[1].creditsUsed).toBe(1);
    });

    it('should allow empty messages array', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [],
      };

      const conversation = await AgentCopilotConversation.create(conversationData);
      expect(conversation.messages).toHaveLength(0);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const conversationData = {
        workspace: new mongoose.Types.ObjectId(),
        agent: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        messages: [],
      };

      const conversation = await AgentCopilotConversation.create(conversationData);

      expect(conversation.createdAt).toBeDefined();
      expect(conversation.updatedAt).toBeDefined();
      expect(conversation.createdAt).toBeInstanceOf(Date);
      expect(conversation.updatedAt).toBeInstanceOf(Date);
    });
  });
});
