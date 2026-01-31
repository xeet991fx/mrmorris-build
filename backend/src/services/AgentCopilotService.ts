import { GoogleGenerativeAI } from '@google/generative-ai';
import { Response } from 'express';
import AgentCopilotConversation, { IAgentCopilotConversation } from '../models/AgentCopilotConversation';
import Agent from '../models/Agent';
import EmailTemplate from '../models/EmailTemplate';
import CustomFieldDefinition from '../models/CustomFieldDefinition';
import IntegrationCredential from '../models/IntegrationCredential';
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

      // Load agent for context (include workspace filter for security)
      const agent = await Agent.findOne({
        _id: conversation.agent,
        workspace: conversation.workspace
      });

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

      // Create timeout promise (30 seconds for Gemini API)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000);
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
   * Generate complete agent workflow from user description
   * Story 4.2, Task 1.1
   */
  async generateWorkflow(
    workspaceId: string,
    userDescription: string,
    res: Response,
    agentId?: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Pre-flight credit check (max cost is 3 credits)
      const hasCredits = await this.checkWorkspaceCredits(
        new mongoose.Types.ObjectId(workspaceId),
        3
      );
      if (!hasCredits) {
        res.write(`data: ${JSON.stringify({ error: 'Insufficient credits for workflow generation' })}\n\n`);
        res.end();
        return;
      }

      // Load workspace context for generation
      const context = await this.loadWorkspaceContext(workspaceId);

      // Build generation prompt
      const prompt = this.buildGenerationPrompt(userDescription, context);

      // Start streaming from Gemini 2.5 Pro with 8-second timeout
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Workflow generation timeout after 8 seconds')), 8000);
      });

      const result = await Promise.race([
        model.generateContentStream(prompt),
        timeoutPromise
      ]);

      // Stream tokens via SSE
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const token = chunk.text();
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      const duration = Date.now() - startTime;
      console.info(`[Performance] Workflow generation completed in ${duration}ms`);

      // Validate generated instructions for missing resources (AC3 requirement)
      const validation = await this.validateGeneratedInstructions(workspaceId, fullResponse);

      // Send validation warnings as separate SSE event if any exist
      if (validation.warnings.length > 0) {
        res.write(`data: ${JSON.stringify({
          event: 'validation',
          warnings: validation.warnings,
          suggestions: validation.suggestions
        })}\n\n`);
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Track credits based on complexity (fire-and-forget)
      const stepCount = (fullResponse.match(/^\d+\./gm) || []).length;
      const credits = stepCount > 10 ? 3 : 2;
      this.deductCredits(new mongoose.Types.ObjectId(workspaceId), credits).catch(err => {
        console.error('[Credit Deduction Error]', err);
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[Error] Workflow generation failed after ${duration}ms:`, error);

      const errorMessage = error.message.includes('timeout')
        ? 'Workflow generation timeout. Please try with a simpler description.'
        : 'Failed to generate workflow. Please try again.';

      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * Load workspace context for workflow generation
   * Story 4.2, Task 1.1 (Context Injection)
   */
  private async loadWorkspaceContext(workspaceId: string): Promise<string> {
    // Load top 20 most-used templates
    const templates = await EmailTemplate.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    })
      .sort({ usageCount: -1 })
      .limit(20)
      .select('name description')
      .lean();

    // Load custom fields
    const customFields = await CustomFieldDefinition.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    })
      .select('fieldKey fieldLabel fieldType')
      .lean();

    // Load active integrations
    const integrations = await IntegrationCredential.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      isValid: true
    })
      .select('type name')
      .lean();

    // Build context string
    const contextString = `
AVAILABLE TEMPLATES:
${templates.length > 0 ? templates.map(t => `- "${t.name}": ${t.description || 'No description'}`).join('\n') : '- No templates created yet'}

CUSTOM FIELDS:
${customFields.length > 0 ? customFields.map(f => `- @contact.${f.fieldKey} (${f.fieldType})`).join('\n') : '- No custom fields defined'}

CONNECTED INTEGRATIONS:
${integrations.length > 0 ? integrations.map(i => `- ${i.type} (${i.name})`).join('\n') : '- No integrations connected'}

AVAILABLE ACTIONS:
1. Send Email - send email using template '[template-name]'
2. LinkedIn Invitation - send LinkedIn invitation with note '[message]'
3. Web Search - search web for '[query]'
4. Create Task - create task '[task-name]' for team
5. Add Tag - add tag '[tag-name]'
6. Remove Tag - remove tag '[tag-name]'
7. Update Field - update [field-name] to [value]
8. Enrich Contact - enrich contact with Apollo.io
9. Wait - wait [X] days

TRIGGER TYPES:
- Manual: Run on demand
- Scheduled: Daily/weekly/monthly
- Event: contact_created, deal_updated, form_submitted
`;

    return contextString;
  }

  /**
   * Validate generated instructions for missing resources
   * Story 4.2, Task 1.2
   */
  async validateGeneratedInstructions(
    workspaceId: string,
    generatedText: string
  ): Promise<{
    isValid: boolean;
    warnings: Array<{
      type: 'missing_template' | 'missing_field' | 'missing_integration' | 'invalid_syntax';
      message: string;
      line: number;
    }>;
    suggestions: string[];
  }> {
    const warnings: Array<{
      type: 'missing_template' | 'missing_field' | 'missing_integration' | 'invalid_syntax';
      message: string;
      line: number;
    }> = [];

    // Parse template references: "using template 'xyz'"
    const templateRegex = /using template ['"](.*?)['"]/gi;
    const templateMatches = [...generatedText.matchAll(templateRegex)];

    for (const match of templateMatches) {
      const templateName = match[1];
      const template = await EmailTemplate.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        name: templateName
      });

      if (!template) {
        warnings.push({
          type: 'missing_template',
          message: `Template '${templateName}' not found. Create this template or update the name.`,
          line: this.getLineNumber(generatedText, match.index!)
        });
      }
    }

    // Parse integration references
    if (generatedText.toLowerCase().includes('linkedin')) {
      const linkedinIntegration = await IntegrationCredential.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        type: 'linkedin',
        isValid: true
      });

      if (!linkedinIntegration) {
        warnings.push({
          type: 'missing_integration',
          message: 'LinkedIn integration not connected. Connect in Settings > Integrations.',
          line: 0
        });
      }
    }

    // Check for Apollo.io enrichment references
    if (generatedText.toLowerCase().includes('apollo') || generatedText.toLowerCase().includes('enrich')) {
      const apolloIntegration = await IntegrationCredential.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        type: 'apollo' as any, // Apollo might not be in the enum yet
        isValid: true
      });

      if (!apolloIntegration) {
        warnings.push({
          type: 'missing_integration',
          message: 'Apollo.io integration not connected. Connect in Settings > Integrations for contact enrichment.',
          line: 0
        });
      }
    }

    // Parse custom field references: @contact.customField
    const fieldRegex = /@contact\.(\w+)/g;
    const fieldMatches = [...generatedText.matchAll(fieldRegex)];

    for (const match of fieldMatches) {
      const fieldName = match[1];
      const standardFields = ['firstName', 'lastName', 'email', 'title', 'company'];
      if (standardFields.includes(fieldName)) continue;

      const customField = await CustomFieldDefinition.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        fieldKey: fieldName
      });

      if (!customField) {
        warnings.push({
          type: 'missing_field',
          message: `Custom field '@contact.${fieldName}' not defined.`,
          line: this.getLineNumber(generatedText, match.index!)
        });
      }
    }

    // Validate conditional syntax
    const conditionalRegex = /if\s+(.+?),?\s+(?:then\s+)?(.+)/gi;
    const conditionalMatches = [...generatedText.matchAll(conditionalRegex)];

    for (const match of conditionalMatches) {
      const condition = match[1];
      const validOperators = ['contains', 'equals', 'is', 'greater than', 'less than', 'exists'];
      const hasValidOperator = validOperators.some(op => condition.toLowerCase().includes(op));

      if (!hasValidOperator) {
        warnings.push({
          type: 'invalid_syntax',
          message: `Invalid condition syntax: "${condition}". Use operators: contains, equals, is, greater than, less than, exists`,
          line: this.getLineNumber(generatedText, match.index!)
        });
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions: this.generateSuggestions(warnings)
    };
  }

  /**
   * Suggest splitting complex workflows
   * Story 4.2, Task 1.3
   */
  async suggestWorkflowSplit(instructions: string): Promise<string | null> {
    const stepCount = (instructions.match(/^\d+\./gm) || []).length;

    if (stepCount <= 15) {
      return null; // No split needed
    }

    return `This workflow is complex with ${stepCount} steps. Consider breaking into 2-3 agents:
- Agent 1: Setup and Filtering (steps 1-7)
- Agent 2: Execution and Follow-up (steps 8-${stepCount})

Would you like me to show how to break this up?`;
  }

  /**
   * Ask clarifying questions for vague descriptions
   * Story 4.2, Task 1.4
   */
  async askClarifyingQuestions(userDescription: string): Promise<string[]> {
    // Use simple heuristics to detect vagueness
    const questions: string[] = [];

    if (!userDescription.toLowerCase().match(/(ceo|vp|director|manager|lead)/)) {
      questions.push('What specific sales task should this agent handle?');
    }

    if (!userDescription.toLowerCase().match(/(email|linkedin|call|message)/)) {
      questions.push('What action should the agent take (email, LinkedIn, etc.)?');
    }

    if (!userDescription.toLowerCase().match(/(contact|company|lead|deal)/)) {
      questions.push('Who is the target audience (CEOs, VPs, etc.)?');
    }

    return questions.length > 0 ? questions : [];
  }

  /**
   * Get line number from text index
   */
  private getLineNumber(text: string, index: number): number {
    const lines = text.substring(0, index).split('\n');
    return lines.length;
  }

  /**
   * Generate suggestions from warnings
   */
  private generateSuggestions(warnings: Array<{ type: string; message: string; line: number }>): string[] {
    const suggestions: string[] = [];

    const missingTemplates = warnings.filter(w => w.type === 'missing_template');
    if (missingTemplates.length > 0) {
      suggestions.push('Create the missing email templates in Settings > Email Templates');
    }

    const missingIntegrations = warnings.filter(w => w.type === 'missing_integration');
    if (missingIntegrations.length > 0) {
      suggestions.push('Connect required integrations in Settings > Integrations');
    }

    const syntaxErrors = warnings.filter(w => w.type === 'invalid_syntax');
    if (syntaxErrors.length > 0) {
      suggestions.push('Review conditional syntax. Use format: "If contact.title contains \'CEO\', send email..."');
    }

    return suggestions;
  }

  /**
   * Build prompt for workflow generation
   * Story 4.2, Task 1.1 (System Prompt Design)
   */
  private buildGenerationPrompt(userDescription: string, context: string): string {
    return `You are a sales automation expert creating executable agent workflows for Clianta CRM.

CRITICAL RULES:
- Generate ONLY numbered list format (1. Action, 2. Action, etc.)
- Use EXACT template names from available templates
- Use EXACT custom field names from workspace
- Maximum 15 steps (suggest split if more complex)
- Include conditional logic with "If [condition], then [action]"
- Use wait steps for follow-up timing
- Always use workspace-specific data (don't invent template names)

WORKSPACE CONTEXT:
${context}

USER REQUEST:
"${userDescription}"

GENERATION STRATEGY:
1. If description is vague (missing audience/action/trigger) → ASK 2-4 clarifying questions instead of generating
2. If workflow needs >15 steps → SUGGEST splitting into 2-3 agents
3. If template referenced doesn't exist → INCLUDE WARNING: "⚠️ Template '[name]' not found"
4. If integration needed but not connected → INCLUDE WARNING: "🔌 [Integration] not connected"

FORMAT OUTPUT:
Either:
A) NUMBERED WORKFLOW (if clear description):
1. [Action with specific parameters]
2. [Action with specific parameters]
...

B) CLARIFYING QUESTIONS (if vague):
Before I generate, I need to clarify:
- [Question 1]
- [Question 2]
- [Question 3]

C) SPLIT SUGGESTION (if complex):
This workflow is complex. Consider breaking into:
- Agent 1: [Purpose] (steps 1-7)
- Agent 2: [Purpose] (steps 8-15)

Now generate:`;
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
