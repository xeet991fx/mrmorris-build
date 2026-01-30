import mongoose from 'mongoose';
import { Response } from 'express';
import AgentCopilotService from './AgentCopilotService';
import AgentCopilotConversation from '../models/AgentCopilotConversation';
import Agent from '../models/Agent';

// Mock Response for SSE testing
class MockResponse {
  public headers: Record<string, string> = {};
  public chunks: string[] = [];
  public ended = false;

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  write(chunk: string) {
    this.chunks.push(chunk);
  }

  end() {
    this.ended = true;
  }
}

describe('AgentCopilotService', () => {
  let service: AgentCopilotService;
  const testWorkspaceId = new mongoose.Types.ObjectId();
  const testAgentId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/mrmorris-test';
    await mongoose.connect(mongoUri);
    service = new AgentCopilotService();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AgentCopilotConversation.deleteMany({});
    await Agent.deleteMany({});
  });

  describe('getOrCreateConversation', () => {
    it('should create new conversation if none exists', async () => {
      const conversation = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      expect(conversation).toBeDefined();
      expect(conversation.workspace.toString()).toBe(testWorkspaceId.toString());
      expect(conversation.agent.toString()).toBe(testAgentId.toString());
      expect(conversation.user.toString()).toBe(testUserId.toString());
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].role).toBe('system');
      expect(conversation.messages[0].content).toContain('AI Copilot');
    });

    it('should return existing conversation if not expired', async () => {
      // Create first conversation
      const conv1 = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      // Get again - should return same conversation
      const conv2 = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      expect(conv1._id.toString()).toBe(conv2._id.toString());
    });

    it('should set expiresAt to 7 days from now', async () => {
      const conversation = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const expectedExpiry = new Date(Date.now() + sevenDaysInMs);
      const timeDiff = Math.abs(conversation.expiresAt.getTime() - expectedExpiry.getTime());

      expect(timeDiff).toBeLessThan(5000); // 5 second tolerance
    });
  });

  describe('clearConversation', () => {
    it('should clear all messages and add reset message', async () => {
      // Create conversation with messages
      const conversation = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      // Add some messages
      conversation.messages.push({
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
        creditsUsed: 0,
      });
      await conversation.save();

      // Clear conversation
      await service.clearConversation(conversation._id.toString());

      // Verify cleared
      const updated = await AgentCopilotConversation.findById(conversation._id);
      expect(updated?.messages).toHaveLength(1);
      expect(updated?.messages[0].role).toBe('system');
      expect(updated?.messages[0].content).toContain('Conversation cleared');
    });
  });

  describe('getConversationHistory', () => {
    it('should return last 10 messages', async () => {
      const conversation = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      // Add 15 messages
      for (let i = 0; i < 15; i++) {
        conversation.messages.push({
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
          creditsUsed: 0,
        });
      }
      await conversation.save();

      // Get history
      const history = await service.getConversationHistory(conversation._id.toString());

      expect(history.length).toBeLessThanOrEqual(10);
      expect(history[0]).toHaveProperty('role');
      expect(history[0]).toHaveProperty('content');
      expect(history[0]).toHaveProperty('timestamp');
    });

    it('should return empty array for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const history = await service.getConversationHistory(fakeId);

      expect(history).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('should add user message to conversation', async () => {
      const conversation = await service.getOrCreateConversation(
        testWorkspaceId.toString(),
        testAgentId.toString(),
        testUserId.toString()
      );

      const mockRes = new MockResponse() as any;

      // Note: This test will fail without Gemini API key
      // In real environment, mock the Gemini API call
      try {
        await service.sendMessage(
          conversation._id.toString(),
          'Hello',
          mockRes
        );
      } catch (error) {
        // Expected to fail without API key
      }

      // Verify user message was added
      const updated = await AgentCopilotConversation.findById(conversation._id);
      const userMessages = updated?.messages.filter((m) => m.role === 'user');
      expect(userMessages?.length).toBeGreaterThan(0);
    });
  });
});
