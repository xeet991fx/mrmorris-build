import express from 'express';
import Chatbot from '../models/Chatbot';
import ChatbotService from '../services/ChatbotService';

const router = express.Router();

// ============================================
// CHATBOT CRUD ROUTES
// ============================================

/**
 * GET /api/workspaces/:workspaceId/chatbots
 * Get all chatbots for workspace
 */
router.get('/workspaces/:workspaceId/chatbots', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status } = req.query;

    const query: any = { workspaceId };
    if (status) {
      query.status = status;
    }

    const chatbots = await Chatbot.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: chatbots,
    });
  } catch (error: any) {
    console.error('Get chatbots error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chatbots',
    });
  }
});

/**
 * GET /api/workspaces/:workspaceId/chatbots/active
 * Get active chatbot for workspace
 */
router.get('/workspaces/:workspaceId/chatbots/active', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const chatbot = await ChatbotService.getActiveChatbot(workspaceId);

    if (!chatbot) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: chatbot,
    });
  } catch (error: any) {
    console.error('Get active chatbot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active chatbot',
    });
  }
});

/**
 * GET /api/workspaces/:workspaceId/chatbots/:chatbotId
 * Get chatbot by ID
 */
router.get('/workspaces/:workspaceId/chatbots/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const chatbot = await Chatbot.findById(chatbotId).lean();

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot not found',
      });
    }

    res.json({
      success: true,
      data: chatbot,
    });
  } catch (error: any) {
    console.error('Get chatbot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chatbot',
    });
  }
});

/**
 * POST /api/workspaces/:workspaceId/chatbots
 * Create new chatbot
 */
router.post('/workspaces/:workspaceId/chatbots', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      name,
      description,
      trigger,
      steps,
      settings,
      useAI,
      aiProvider,
      aiModel,
      aiSystemPrompt,
    } = req.body;

    // TODO: Get userId from auth context
    const userId = req.body.userId || 'default_user_id';

    const chatbot = await Chatbot.create({
      workspaceId,
      userId,
      name,
      description,
      trigger: trigger || {
        type: 'page_load',
        urlMatch: 'all',
      },
      steps: steps || [],
      settings: settings || {},
      useAI: useAI || false,
      aiProvider,
      aiModel,
      aiSystemPrompt,
      status: 'draft',
    });

    res.status(201).json({
      success: true,
      data: chatbot,
    });
  } catch (error: any) {
    console.error('Create chatbot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create chatbot',
    });
  }
});

/**
 * PATCH /api/workspaces/:workspaceId/chatbots/:chatbotId
 * Update chatbot
 */
router.patch('/workspaces/:workspaceId/chatbots/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const updates = req.body;

    // Don't allow changing workspace or user
    delete updates.workspaceId;
    delete updates.userId;

    const chatbot = await Chatbot.findByIdAndUpdate(
      chatbotId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot not found',
      });
    }

    res.json({
      success: true,
      data: chatbot,
    });
  } catch (error: any) {
    console.error('Update chatbot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update chatbot',
    });
  }
});

/**
 * PATCH /api/workspaces/:workspaceId/chatbots/:chatbotId/status
 * Update chatbot status (activate/pause/archive)
 */
router.patch('/workspaces/:workspaceId/chatbots/:chatbotId/status', async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const updates: any = { status };

    // If activating, set lastActivatedAt
    if (status === 'active') {
      updates.lastActivatedAt = new Date();
    }

    const chatbot = await Chatbot.findByIdAndUpdate(
      chatbotId,
      { $set: updates },
      { new: true }
    );

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot not found',
      });
    }

    res.json({
      success: true,
      data: chatbot,
    });
  } catch (error: any) {
    console.error('Update chatbot status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update chatbot status',
    });
  }
});

/**
 * DELETE /api/workspaces/:workspaceId/chatbots/:chatbotId
 * Delete chatbot
 */
router.delete('/workspaces/:workspaceId/chatbots/:chatbotId', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const chatbot = await Chatbot.findByIdAndDelete(chatbotId);

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot not found',
      });
    }

    res.json({
      success: true,
      message: 'Chatbot deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete chatbot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete chatbot',
    });
  }
});

/**
 * POST /api/workspaces/:workspaceId/chatbots/:chatbotId/duplicate
 * Duplicate chatbot
 */
router.post('/workspaces/:workspaceId/chatbots/:chatbotId/duplicate', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const originalChatbot = await Chatbot.findById(chatbotId);
    if (!originalChatbot) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot not found',
      });
    }

    const duplicatedChatbot = await Chatbot.create({
      workspaceId: originalChatbot.workspaceId,
      userId: originalChatbot.userId,
      name: `${originalChatbot.name} (Copy)`,
      description: originalChatbot.description,
      trigger: originalChatbot.trigger,
      steps: originalChatbot.steps,
      settings: originalChatbot.settings,
      useAI: originalChatbot.useAI,
      aiProvider: originalChatbot.aiProvider,
      aiModel: originalChatbot.aiModel,
      aiSystemPrompt: originalChatbot.aiSystemPrompt,
      status: 'draft',
    });

    res.status(201).json({
      success: true,
      data: duplicatedChatbot,
    });
  } catch (error: any) {
    console.error('Duplicate chatbot error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to duplicate chatbot',
    });
  }
});

/**
 * GET /api/workspaces/:workspaceId/chatbots/:chatbotId/stats
 * Get chatbot statistics
 */
router.get('/workspaces/:workspaceId/chatbots/:chatbotId/stats', async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const chatbot = await Chatbot.findById(chatbotId).select('stats').lean();

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot not found',
      });
    }

    res.json({
      success: true,
      data: chatbot.stats,
    });
  } catch (error: any) {
    console.error('Get chatbot stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chatbot stats',
    });
  }
});

// ============================================
// CHATBOT TEMPLATES
// ============================================

/**
 * GET /api/workspaces/:workspaceId/chatbots/templates
 * Get chatbot templates (pre-built flows)
 */
router.get('/workspaces/:workspaceId/chatbot-templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'lead_qualification',
        name: 'Lead Qualification',
        description: 'Qualify leads by asking about budget, timeline, and needs',
        icon: '🎯',
        steps: [
          {
            id: 'welcome',
            type: 'message',
            name: 'Welcome Message',
            message: "Hi! 👋 I'm here to help. Can I ask you a few quick questions?",
            nextStepId: 'ask_name',
            position: { x: 100, y: 100 },
          },
          {
            id: 'ask_name',
            type: 'collect_info',
            name: 'Ask Name',
            message: "What's your name?",
            collectField: 'name',
            questionType: 'text',
            nextStepId: 'ask_email',
            position: { x: 100, y: 200 },
          },
          {
            id: 'ask_email',
            type: 'collect_info',
            name: 'Ask Email',
            message: "Great! What's your email address?",
            collectField: 'email',
            questionType: 'email',
            questionRequired: true,
            nextStepId: 'ask_budget',
            position: { x: 100, y: 300 },
          },
          {
            id: 'ask_budget',
            type: 'question',
            name: 'Ask Budget',
            message: "What's your budget range?",
            questionType: 'choice',
            choices: [
              { id: '1', label: 'Less than $1,000', value: 'low', nextStepId: 'low_budget' },
              { id: '2', label: '$1,000 - $10,000', value: 'medium', nextStepId: 'medium_budget' },
              { id: '3', label: 'More than $10,000', value: 'high', nextStepId: 'high_budget' },
            ],
            position: { x: 100, y: 400 },
          },
          {
            id: 'low_budget',
            type: 'action',
            name: 'Score Low Budget',
            actionType: 'update_lead_score',
            actionConfig: { scorePoints: 10, scoreReason: 'Low budget' },
            nextStepId: 'thank_you',
            position: { x: 50, y: 500 },
          },
          {
            id: 'medium_budget',
            type: 'action',
            name: 'Score Medium Budget',
            actionType: 'update_lead_score',
            actionConfig: { scorePoints: 30, scoreReason: 'Medium budget' },
            nextStepId: 'thank_you',
            position: { x: 200, y: 500 },
          },
          {
            id: 'high_budget',
            type: 'action',
            name: 'Score High Budget',
            actionType: 'update_lead_score',
            actionConfig: { scorePoints: 50, scoreReason: 'High budget' },
            nextStepId: 'handoff_sales',
            position: { x: 350, y: 500 },
          },
          {
            id: 'handoff_sales',
            type: 'handoff',
            name: 'Hand Off to Sales',
            handoffMessage: "Thanks! I'm connecting you with our sales team now.",
            handoffToTeam: true,
            position: { x: 350, y: 600 },
          },
          {
            id: 'thank_you',
            type: 'message',
            name: 'Thank You',
            message: "Thank you! We'll be in touch soon.",
            position: { x: 150, y: 600 },
          },
        ],
      },
      {
        id: 'contact_collection',
        name: 'Contact Information Collection',
        description: 'Simple flow to collect visitor name and email',
        icon: '📇',
        steps: [
          {
            id: 'welcome',
            type: 'message',
            name: 'Welcome',
            message: "Hi there! 👋 Let's get to know you.",
            nextStepId: 'ask_name',
            position: { x: 100, y: 100 },
          },
          {
            id: 'ask_name',
            type: 'collect_info',
            name: 'Ask Name',
            message: "What's your name?",
            collectField: 'name',
            questionType: 'text',
            nextStepId: 'ask_email',
            position: { x: 100, y: 200 },
          },
          {
            id: 'ask_email',
            type: 'collect_info',
            name: 'Ask Email',
            message: "And your email?",
            collectField: 'email',
            questionType: 'email',
            questionRequired: true,
            nextStepId: 'thank_you',
            position: { x: 100, y: 300 },
          },
          {
            id: 'thank_you',
            type: 'message',
            name: 'Thank You',
            message: "Perfect! We'll be in touch.",
            position: { x: 100, y: 400 },
          },
        ],
      },
      {
        id: 'support_triage',
        name: 'Support Triage',
        description: 'Route support requests to the right team',
        icon: '🎧',
        steps: [
          {
            id: 'welcome',
            type: 'message',
            name: 'Welcome',
            message: "Hi! How can we help you today?",
            nextStepId: 'ask_issue_type',
            position: { x: 100, y: 100 },
          },
          {
            id: 'ask_issue_type',
            type: 'question',
            name: 'Ask Issue Type',
            message: "What do you need help with?",
            questionType: 'choice',
            choices: [
              { id: '1', label: 'Technical Support', value: 'technical', nextStepId: 'route_technical' },
              { id: '2', label: 'Billing Question', value: 'billing', nextStepId: 'route_billing' },
              { id: '3', label: 'General Question', value: 'general', nextStepId: 'route_general' },
            ],
            position: { x: 100, y: 200 },
          },
          {
            id: 'route_technical',
            type: 'handoff',
            name: 'Route to Technical',
            handoffMessage: "Connecting you to our technical support team...",
            position: { x: 50, y: 300 },
          },
          {
            id: 'route_billing',
            type: 'handoff',
            name: 'Route to Billing',
            handoffMessage: "Connecting you to our billing team...",
            position: { x: 200, y: 300 },
          },
          {
            id: 'route_general',
            type: 'handoff',
            name: 'Route to General',
            handoffMessage: "Connecting you to our support team...",
            position: { x: 350, y: 300 },
          },
        ],
      },
    ];

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('Get chatbot templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get chatbot templates',
    });
  }
});

/**
 * POST /api/workspaces/:workspaceId/chatbots/from-template
 * Create chatbot from template
 */
router.post('/workspaces/:workspaceId/chatbots/from-template', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { templateId, name } = req.body;

    // TODO: Get userId from auth context
    const userId = req.body.userId || 'default_user_id';

    // Get template (from the endpoint above)
    const templatesResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/workspaces/${workspaceId}/chatbot-templates`);
    const templatesData: any = await templatesResponse.json();
    const template = templatesData.data?.find((t: any) => t.id === templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const chatbot = await Chatbot.create({
      workspaceId,
      userId,
      name: name || template.name,
      description: template.description,
      trigger: {
        type: 'page_load',
        urlMatch: 'all',
      },
      steps: template.steps,
      settings: {
        botName: 'Assistant',
        brandColor: '#667eea',
        enableTypingIndicator: true,
      },
      status: 'draft',
    });

    res.status(201).json({
      success: true,
      data: chatbot,
    });
  } catch (error: any) {
    console.error('Create chatbot from template error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create chatbot from template',
    });
  }
});

export default router;
