import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { chatService } from '../services/ChatService';
import Conversation from '../models/Conversation';
import ChatMessage from '../models/ChatMessage';

const router = express.Router();

/**
 * @route   GET /api/workspaces/:workspaceId/chat/conversations
 * @desc    Get all conversations for workspace
 * @access  Private
 */
router.get(
  '/:workspaceId/chat/conversations',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { status, assignedTo } = req.query;

      const query: any = { workspaceId };

      if (status) {
        query.status = status;
      }

      if (assignedTo) {
        query.assignedTo = assignedTo;
      }

      const conversations = await Conversation.find(query)
        .populate('contactId', 'firstName lastName email company')
        .populate('assignedTo', 'name email')
        .sort({ lastMessageAt: -1 })
        .limit(100);

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations',
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/chat/conversations/:id
 * @desc    Get single conversation with messages
 * @access  Private
 */
router.get(
  '/:workspaceId/chat/conversations/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const conversation = await Conversation.findById(id)
        .populate('contactId', 'firstName lastName email company phone')
        .populate('assignedTo', 'name email');

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      const messages = await chatService.getMessages(id);

      res.json({
        success: true,
        data: {
          conversation,
          messages,
        },
      });
    } catch (error: any) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation',
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/chat/conversations/:id/messages
 * @desc    Send message in conversation (agent)
 * @access  Private
 */
router.post(
  '/:workspaceId/chat/conversations/:id/messages',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
        });
      }

      const chatMessage = await chatService.sendMessage(
        id,
        'agent',
        message,
        (req.user?._id as any).toString(),
        req.user?.name
      );

      // Mark visitor messages as read
      await chatService.markAsRead(id, 'agent');

      res.json({
        success: true,
        data: chatMessage,
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/chat/conversations/:id/assign
 * @desc    Assign conversation to agent
 * @access  Private
 */
router.patch(
  '/:workspaceId/chat/conversations/:id/assign',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      const conversation = await chatService.assignConversation(
        id,
        agentId || (req.user?._id as any).toString()
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      console.error('Assign conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign conversation',
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/chat/conversations/:id/close
 * @desc    Close conversation
 * @access  Private
 */
router.patch(
  '/:workspaceId/chat/conversations/:id/close',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { rating } = req.body;

      const conversation = await chatService.closeConversation(id, rating);

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      console.error('Close conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close conversation',
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/chat/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get(
  '/:workspaceId/chat/unread-count',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      const count = await chatService.getUnreadCount(workspaceId, true);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get unread count',
      });
    }
  }
);

export default router;
