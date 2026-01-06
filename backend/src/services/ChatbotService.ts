import Chatbot, { IChatbot, IChatbotStep, IChatbotCondition } from '../models/Chatbot';
import Conversation from '../models/Conversation';
import ChatMessage from '../models/ChatMessage';
import Contact from '../models/Contact';
import LeadScore from '../models/LeadScore';
import ContactList from '../models/ContactList';
import { Types } from 'mongoose';

interface ChatbotContext {
  conversationId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  visitorId: string;
  contactId?: Types.ObjectId;
  responses: Map<string, any>; // stepId -> user response
  variables: Map<string, any>; // Custom variables (email, name, etc.)
}

class ChatbotService {
  /**
   * Get active chatbot for workspace
   */
  async getActiveChatbot(workspaceId: string): Promise<IChatbot | null> {
    try {
      return await Chatbot.findOne({
        workspaceId,
        status: 'active',
      }).lean();
    } catch (error) {
      console.error('Error getting active chatbot:', error);
      return null;
    }
  }

  /**
   * Check if chatbot should trigger for this visitor
   */
  shouldTriggerBot(chatbot: IChatbot, context: { url?: string; visitCount?: number }): boolean {
    const { trigger } = chatbot;

    // Check URL match
    if (trigger.urlMatch !== 'all') {
      if (!context.url || !trigger.urlPattern) return false;

      switch (trigger.urlMatch) {
        case 'specific':
          if (context.url !== trigger.urlPattern) return false;
          break;
        case 'contains':
          if (!context.url.includes(trigger.urlPattern)) return false;
          break;
        case 'regex':
          try {
            const regex = new RegExp(trigger.urlPattern);
            if (!regex.test(context.url)) return false;
          } catch (e) {
            return false;
          }
          break;
      }
    }

    // Additional trigger conditions can be checked here (time, scroll, etc.)
    return true;
  }

  /**
   * Initialize chatbot conversation
   */
  async initializeChatbot(
    chatbotId: string,
    conversationId: string,
    workspaceId: string
  ): Promise<{ step: IChatbotStep; message: any } | null> {
    try {
      const chatbot = await Chatbot.findById(chatbotId);
      if (!chatbot || chatbot.status !== 'active') {
        return null;
      }

      const firstStep = chatbot.getFirstStep();
      if (!firstStep) {
        return null;
      }

      // Send welcome message if configured
      if (chatbot.settings.welcomeMessage) {
        const welcomeMsg = await ChatMessage.create({
          conversationId,
          workspaceId,
          message: chatbot.settings.welcomeMessage,
          senderType: 'bot',
          senderName: chatbot.settings.botName || 'Assistant',
          isRead: false,
        });
      }

      // Execute first step
      return await this.executeStep(chatbotId, firstStep.id, conversationId, workspaceId, new Map(), new Map());
    } catch (error) {
      console.error('Error initializing chatbot:', error);
      return null;
    }
  }

  /**
   * Process user response and get next step
   */
  async processResponse(
    chatbotId: string,
    currentStepId: string,
    userResponse: any,
    conversationId: string,
    workspaceId: string,
    responses: Map<string, any>,
    variables: Map<string, any>
  ): Promise<{ step: IChatbotStep; message: any } | null> {
    try {
      const chatbot = await Chatbot.findById(chatbotId);
      if (!chatbot) return null;

      const currentStep = chatbot.getStepById(currentStepId);
      if (!currentStep) return null;

      // Store response
      responses.set(currentStepId, userResponse);

      // Handle step-specific logic
      await this.handleStepResponse(currentStep, userResponse, conversationId, workspaceId, variables);

      // Determine next step
      const nextStepId = this.getNextStep(currentStep, userResponse, responses, variables);
      if (!nextStepId) {
        // Conversation complete
        await this.completeChatbotConversation(chatbotId, conversationId);
        return null;
      }

      // Execute next step
      return await this.executeStep(chatbotId, nextStepId, conversationId, workspaceId, responses, variables);
    } catch (error) {
      console.error('Error processing chatbot response:', error);
      return null;
    }
  }

  /**
   * Execute a chatbot step
   */
  private async executeStep(
    chatbotId: string,
    stepId: string,
    conversationId: string,
    workspaceId: string,
    responses: Map<string, any>,
    variables: Map<string, any>
  ): Promise<{ step: IChatbotStep; message: any } | null> {
    try {
      const chatbot = await Chatbot.findById(chatbotId);
      if (!chatbot) return null;

      const step = chatbot.getStepById(stepId);
      if (!step) return null;

      // Handle different step types
      switch (step.type) {
        case 'message':
          return await this.executeMessageStep(step, conversationId, workspaceId, chatbot);

        case 'question':
        case 'collect_info':
          return await this.executeQuestionStep(step, conversationId, workspaceId, chatbot);

        case 'condition':
          // Evaluate condition and move to next step automatically
          const nextStepId = this.evaluateCondition(step, responses, variables);
          if (nextStepId) {
            return await this.executeStep(chatbotId, nextStepId, conversationId, workspaceId, responses, variables);
          }
          return null;

        case 'action':
          // Execute action and move to next step
          await this.executeAction(step, conversationId, workspaceId, variables);
          if (step.nextStepId) {
            return await this.executeStep(chatbotId, step.nextStepId, conversationId, workspaceId, responses, variables);
          }
          return null;

        case 'handoff':
          // Hand off to human agent
          await this.executeHandoff(step, conversationId);
          return null;

        default:
          return null;
      }
    } catch (error) {
      console.error('Error executing chatbot step:', error);
      return null;
    }
  }

  /**
   * Execute message step (bot sends a message)
   */
  private async executeMessageStep(
    step: IChatbotStep,
    conversationId: string,
    workspaceId: string,
    chatbot: IChatbot
  ): Promise<{ step: IChatbotStep; message: any }> {
    const message = await ChatMessage.create({
      conversationId,
      workspaceId,
      message: step.message || '',
      senderType: 'bot',
      senderName: chatbot.settings.botName || 'Assistant',
      isRead: false,
    });

    return {
      step,
      message: message.toObject(),
    };
  }

  /**
   * Execute question step (bot asks a question)
   */
  private async executeQuestionStep(
    step: IChatbotStep,
    conversationId: string,
    workspaceId: string,
    chatbot: IChatbot
  ): Promise<{ step: IChatbotStep; message: any }> {
    // Create bot message with question
    const message = await ChatMessage.create({
      conversationId,
      workspaceId,
      message: step.message || step.questionLabel || '',
      senderType: 'bot',
      senderName: chatbot.settings.botName || 'Assistant',
      isRead: false,
      metadata: {
        questionType: step.questionType,
        choices: step.choices,
        placeholder: step.questionPlaceholder,
        required: step.questionRequired,
        validation: step.questionValidation,
      },
    });

    return {
      step,
      message: message.toObject(),
    };
  }

  /**
   * Handle step response (store data, update contact, etc.)
   */
  private async handleStepResponse(
    step: IChatbotStep,
    response: any,
    conversationId: string,
    workspaceId: string,
    variables: Map<string, any>
  ): Promise<void> {
    // Collect contact information
    if (step.type === 'collect_info' && step.collectField) {
      variables.set(step.collectField, response);

      // Update conversation with collected info
      const updateData: any = {};
      if (step.collectField === 'email') {
        updateData.visitorEmail = response;
      } else if (step.collectField === 'name') {
        updateData.visitorName = response;
      } else if (step.collectField === 'phone') {
        updateData.visitorPhone = response;
      }

      if (Object.keys(updateData).length > 0) {
        await Conversation.findByIdAndUpdate(conversationId, updateData);
      }

      // Create or update contact if we have email
      if (step.collectField === 'email' || variables.has('email')) {
        await this.createOrUpdateContact(conversationId, workspaceId, variables);
      }
    }
  }

  /**
   * Create or update contact from collected variables
   */
  private async createOrUpdateContact(
    conversationId: string,
    workspaceId: string,
    variables: Map<string, any>
  ): Promise<void> {
    const email = variables.get('email');
    if (!email) return;

    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Find or create contact
      let contact = await Contact.findOne({ workspaceId, email });

      if (!contact) {
        const name = variables.get('name') || '';
        const nameParts = name.split(' ');

        contact = await Contact.create({
          workspaceId,
          email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          phone: variables.get('phone'),
          company: variables.get('company') || conversation.companyName,
          source: 'chatbot',
          status: 'lead',
        });

        // Initialize lead score
        await LeadScore.create({
          workspaceId,
          contactId: contact._id,
          currentScore: 20, // Starting score for chatbot lead
          events: [
            {
              eventType: 'chatbot_conversation',
              points: 20,
              reason: 'Started chatbot conversation',
              metadata: { conversationId },
            },
          ],
        });
      }

      // Link contact to conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        contactId: contact._id,
      });
    } catch (error) {
      console.error('Error creating/updating contact:', error);
    }
  }

  /**
   * Determine next step based on current step and response
   */
  private getNextStep(
    step: IChatbotStep,
    response: any,
    responses: Map<string, any>,
    variables: Map<string, any>
  ): string | null {
    // For choice questions, check if choice has specific next step
    if (step.type === 'question' && step.questionType === 'choice' && step.choices) {
      const selectedChoice = step.choices.find(c => c.value === response || c.label === response);
      if (selectedChoice?.nextStepId) {
        return selectedChoice.nextStepId;
      }
    }

    // Use default next step
    return step.nextStepId || null;
  }

  /**
   * Evaluate condition step
   */
  private evaluateCondition(
    step: IChatbotStep,
    responses: Map<string, any>,
    variables: Map<string, any>
  ): string | null {
    if (!step.conditions || step.conditions.length === 0) {
      return step.nextStepId || null;
    }

    const logic = step.conditionLogic || 'AND';
    const results = step.conditions.map(condition =>
      this.evaluateSingleCondition(condition, responses, variables)
    );

    const conditionMet = logic === 'AND' ? results.every(r => r) : results.some(r => r);

    if (conditionMet) {
      return step.branches?.yes || step.nextStepId || null;
    } else {
      return step.branches?.no || step.nextStepId || null;
    }
  }

  /**
   * Evaluate single condition
   */
  private evaluateSingleCondition(
    condition: IChatbotCondition,
    responses: Map<string, any>,
    variables: Map<string, any>
  ): boolean {
    // Get the value to check (from responses or variables)
    const fieldValue = variables.get(condition.field) || responses.get(condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue == condition.value;
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      default:
        return false;
    }
  }

  /**
   * Execute action step
   */
  private async executeAction(
    step: IChatbotStep,
    conversationId: string,
    workspaceId: string,
    variables: Map<string, any>
  ): Promise<void> {
    if (!step.actionType || !step.actionConfig) return;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;

    switch (step.actionType) {
      case 'update_lead_score':
        if (conversation.contactId) {
          await this.updateLeadScore(
            workspaceId,
            conversation.contactId,
            step.actionConfig.scorePoints || 0,
            step.actionConfig.scoreReason || 'Chatbot action'
          );
        }
        break;

      case 'add_to_list':
        if (conversation.contactId && step.actionConfig.listId) {
          await this.addContactToList(conversation.contactId, step.actionConfig.listId);
        }
        break;

      // Additional actions can be implemented here
      case 'send_notification':
      case 'trigger_workflow':
      case 'book_meeting':
      case 'send_email':
        // TODO: Implement these actions
        break;
    }
  }

  /**
   * Update lead score
   */
  private async updateLeadScore(
    workspaceId: string,
    contactId: Types.ObjectId,
    points: number,
    reason: string
  ): Promise<void> {
    try {
      let leadScore = await LeadScore.findOne({ workspaceId, contactId });

      if (!leadScore) {
        leadScore = await LeadScore.create({
          workspaceId,
          contactId,
          currentScore: points,
          events: [{ eventType: 'chatbot_action', points, reason }],
        });
      } else {
        (leadScore as any).events.push({
          eventType: 'chatbot_action',
          points,
          reason,
          timestamp: new Date(),
        });
        leadScore.currentScore += points;
        await leadScore.save();
      }
    } catch (error) {
      console.error('Error updating lead score:', error);
    }
  }

  /**
   * Add contact to list
   */
  private async addContactToList(contactId: Types.ObjectId, listId: string): Promise<void> {
    try {
      await ContactList.findByIdAndUpdate(listId, {
        $addToSet: { contacts: contactId },
      });
    } catch (error) {
      console.error('Error adding contact to list:', error);
    }
  }

  /**
   * Execute handoff to human agent
   */
  private async executeHandoff(step: IChatbotStep, conversationId: string): Promise<void> {
    try {
      await Conversation.findByIdAndUpdate(conversationId, {
        status: 'waiting', // Waiting for human agent
      });

      // Send handoff message
      if (step.handoffMessage) {
        await ChatMessage.create({
          conversationId,
          message: step.handoffMessage,
          senderType: 'system',
          isRead: false,
        });
      }
    } catch (error) {
      console.error('Error executing handoff:', error);
    }
  }

  /**
   * Complete chatbot conversation
   */
  private async completeChatbotConversation(chatbotId: string, conversationId: string): Promise<void> {
    try {
      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        status: 'closed',
        closedAt: new Date(),
      });

      // Update chatbot stats
      await Chatbot.findByIdAndUpdate(chatbotId, {
        $inc: {
          'stats.totalConversations': 1,
          'stats.completedConversations': 1,
        },
      });
    } catch (error) {
      console.error('Error completing chatbot conversation:', error);
    }
  }
}

export default new ChatbotService();
