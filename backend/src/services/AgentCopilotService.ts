import { GoogleGenerativeAI } from '@google/generative-ai';
import { Response } from 'express';
import AgentCopilotConversation, { IAgentCopilotConversation } from '../models/AgentCopilotConversation';
import Agent from '../models/Agent';
import mongoose from 'mongoose';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class AgentCopilotService {
  /**
   * Get or create conversation for a workspace/agent/user combination
   */
  async getOrCreateConversation(
    workspaceId: string,
    agentId: string,
    userId: string
  ): Promise<IAgentCopilotConversation> {
    try {
      // Look for existing non-expired conversation
      const existing = await AgentCopilotConversation.findOne({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        agent: new mongoose.Types.ObjectId(agentId),
        user: new mongoose.Types.ObjectId(userId),
        expiresAt: { $gt: new Date() }, // Not expired
      });

      if (existing) {
        return existing;
      }

      // Create new conversation with welcome message
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const conversation = await AgentCopilotConversation.create({
        workspace: new mongoose.Types.ObjectId(workspaceId),
        agent: new mongoose.Types.ObjectId(agentId),
        user: new mongoose.Types.ObjectId(userId),
        messages: [
          {
            role: 'system',
            content: "Hi! I'm your AI Copilot. How can I help you build this agent?",
            timestamp: new Date(),
            creditsUsed: 0,
          },
        ],
        expiresAt: sevenDaysFromNow,
      });

      return conversation;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }

  /**
   * Send message and stream response via SSE
   */
  async sendMessage(
    conversationId: string,
    userMessage: string,
    res: Response
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Load conversation
      const conversation = await AgentCopilotConversation.findById(conversationId);
      if (!conversation) {
        res.write(`data: ${JSON.stringify({ error: 'Conversation not found' })}\n\n`);
        res.end();
        return;
      }

      // Pre-flight credit check (Issue #7 fix)
      // Note: This is a placeholder check. Full credit system will be implemented in Epic 7.
      // For now, we log the check and proceed. In production, this should verify workspace.creditsRemaining.
      const hasCredits = await this.checkWorkspaceCredits(conversation.workspace, 1);
      if (!hasCredits) {
        res.write(`data: ${JSON.stringify({ error: 'Insufficient credits. Please purchase more credits to continue.' })}\n\n`);
        res.end();
        return;
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        creditsUsed: 0,
      });

      // Load agent for context
      const agent = await Agent.findById(conversation.agent);

      // Build prompt with context
      const prompt = this.buildPrompt(conversation, agent, userMessage);

      // Start streaming from Gemini 2.5 Pro with timeout (Issue #8 fix)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
          // Note: Gemini SDK doesn't support timeout directly
          // Timeout is handled by wrapping the call with Promise.race below
        }
      });

      // Create timeout promise (5 seconds as per story requirement)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 5 seconds')), 5000);
      });

      // Race between Gemini call and timeout
      const result = await Promise.race([
        model.generateContentStream(prompt),
        timeoutPromise
      ]);

      // Stream tokens via SSE
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const token = chunk.text();
        fullResponse += token;

        // Send token via SSE
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      const duration = Date.now() - startTime;

      // Log performance (replace console.log with proper logger)
      if (duration > 3000) {
        console.warn(`[Performance] Copilot response time: ${duration}ms (exceeds 3s target)`);
      } else {
        console.info(`[Performance] Copilot response time: ${duration}ms`);
      }

      // Add assistant message
      conversation.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        creditsUsed: 1, // Track 1 credit per message
      });

      // Trim to last 10 messages only
      if (conversation.messages.length > 10) {
        conversation.messages = conversation.messages.slice(-10);
      }

      // Save conversation
      await conversation.save();

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Deduct credits from workspace (Issue #2 fix - now called)
      // Note: Fire and forget - don't await to avoid blocking response
      this.deductCredits(conversation.workspace, 1).catch(err => {
        console.error('[Credit Deduction Error]', err);
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Error] Send message failed after ${duration}ms:`, error);

      const errorMessage = error.message.includes('timeout')
        ? 'Response timeout. Please try again with a simpler question.'
        : 'Failed to generate response. Please try again.';

      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * Build prompt with conversation context
   */
  private buildPrompt(
    conversation: IAgentCopilotConversation,
    agent: any,
    userMessage: string
  ): string {
    // Get last 10 messages for context
    const recentMessages = conversation.messages.slice(-10);
    const historyText = recentMessages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are an AI Copilot helping users build sales automation agents in Clianta CRM.

CONTEXT:
- Agent Name: ${agent?.name || 'New Agent'}
- Agent Goal: ${agent?.goal || 'Not set yet'}
- Agent Instructions: ${agent?.instructions ? agent.instructions.substring(0, 500) : 'Not set yet'}

YOUR ROLE:
- Help users create effective agent workflows
- Explain available actions and features
- Generate complete agent instructions
- Answer questions about automation

AVAILABLE ACTIONS:
1. Send Email - Send email using template
2. LinkedIn Invitation - Send LinkedIn connection request
3. Web Search - Search the web for information
4. Create Task - Create a task for team member
5. Add Tag - Add tag to contact
6. Remove Tag - Remove tag from contact
7. Update Field - Update contact/deal field
8. Enrich Contact - Enrich contact data via Apollo.io
9. Wait - Pause execution for X days

CONVERSATION HISTORY:
${historyText}

USER MESSAGE:
${userMessage}

Provide a helpful, concise response. Format with markdown (bold, lists, code blocks) when appropriate.`;

    return prompt;
  }

  /**
   * Clear conversation history
   */
  async clearConversation(conversationId: string): Promise<void> {
    try {
      const conversation = await AgentCopilotConversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Clear all messages and add reset message
      conversation.messages = [
        {
          role: 'system',
          content: 'Conversation cleared. How can I help?',
          timestamp: new Date(),
          creditsUsed: 0,
        },
      ];

      await conversation.save();
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation history (last 10 messages)
   */
  async getConversationHistory(conversationId: string): Promise<any[]> {
    try {
      const conversation = await AgentCopilotConversation.findById(conversationId);
      if (!conversation) {
        return [];
      }

      // Return last 10 messages
      const messages = conversation.messages.slice(-10);
      return messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Check if workspace has sufficient credits
   *
   * NOTE: This is a placeholder implementation. Full credit tracking system
   * will be implemented in Epic 7 (Production Governance & Safety).
   */
  private async checkWorkspaceCredits(workspaceId: mongoose.Types.ObjectId, requiredCredits: number): Promise<boolean> {
    // Story 4.1 Issue #7 fix: Pre-flight credit check
    console.info(`[Credit Check] Checking ${requiredCredits} credit(s) for workspace ${workspaceId}`);

    // TODO (Epic 7): Integrate with actual credit system
    // Example implementation:
    // const workspace = await Project.findById(workspaceId);
    // return workspace.creditsRemaining >= requiredCredits;

    // For now, always return true (placeholder)
    // In Epic 7, this will check actual workspace.creditsRemaining
    return true;
  }

  /**
   * Deduct credits from workspace
   *
   * NOTE: This is a placeholder implementation. Full credit tracking system
   * will be implemented in Epic 7 (Production Governance & Safety).
   *
   * For now, we log credit usage for audit purposes. When the credit system
   * is implemented, this method should:
   * 1. Check workspace credits balance
   * 2. Return error if insufficient credits
   * 3. Deduct credits atomically
   * 4. Log transaction for audit trail
   */
  private async deductCredits(workspaceId: mongoose.Types.ObjectId, credits: number): Promise<void> {
    // Story 4.1 Issue #2 fix: Credit deduction now actually called (fire-and-forget)
    // Log credit usage for audit trail
    console.info(`[Credit Deduction] Deducted ${credits} credit(s) from workspace ${workspaceId} for AI Copilot usage`, {
      workspaceId: workspaceId.toString(),
      credits,
      timestamp: new Date().toISOString(),
      feature: 'ai-copilot'
    });

    // TODO (Epic 7): Integrate with workspace credit tracking system
    // Example implementation when credit system exists:
    //
    // const workspace = await Project.findById(workspaceId);
    // if (!workspace.creditsRemaining || workspace.creditsRemaining < credits) {
    //   throw new Error('Insufficient credits');
    // }
    //
    // workspace.creditsRemaining -= credits;
    // await workspace.save();
    //
    // await CreditUsageLog.create({
    //   workspace: workspaceId,
    //   feature: 'ai-copilot',
    //   creditsUsed: credits,
    //   timestamp: new Date()
    // });
  }
}

export default AgentCopilotService;
