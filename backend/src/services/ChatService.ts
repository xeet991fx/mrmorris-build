import Conversation from '../models/Conversation';
import ChatMessage from '../models/ChatMessage';
import Contact from '../models/Contact';
import Visitor from '../models/Visitor';
import { companyIdentificationService } from './CompanyIdentificationService';
import { Types } from 'mongoose';

class ChatService {
  /**
   * Create or get existing conversation for a visitor
   */
  async getOrCreateConversation(
    workspaceId: string,
    visitorId: string,
    context: {
      url?: string;
      referrer?: string;
      userAgent?: string;
      ipAddress?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    }
  ) {
    // Check if visitor has an open conversation
    let conversation = await Conversation.findOne({
      workspaceId,
      visitorId,
      status: { $in: ['open', 'assigned', 'waiting'] },
    });

    if (conversation) {
      return conversation;
    }

    // Check if visitor is linked to a contact
    const visitor = await Visitor.findOne({ workspaceId, visitorId });
    const contactId = visitor?.contactId;

    // Get company data from IP
    let companyData = null;
    if (context.ipAddress) {
      const identification = await companyIdentificationService.identifyFromIP(context.ipAddress);
      companyData = identification.companyData;
    }

    // Create new conversation
    conversation = await Conversation.create({
      workspaceId,
      visitorId,
      contactId,
      status: 'open',
      currentUrl: context.url,
      referrer: context.referrer,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      utmSource: context.utmSource,
      utmMedium: context.utmMedium,
      utmCampaign: context.utmCampaign,
      companyName: companyData?.name,
      companyDomain: companyData?.domain,
      companyIndustry: companyData?.industry,
      companySize: companyData?.size,
      companyLocation: companyData?.location,
    });

    return conversation;
  }

  /**
   * Send message in conversation
   */
  async sendMessage(
    conversationId: string,
    senderType: 'visitor' | 'agent' | 'system' | 'bot',
    message: string,
    senderId?: string,
    senderName?: string
  ) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const chatMessage = await ChatMessage.create({
      conversationId,
      workspaceId: conversation.workspaceId,
      message,
      messageType: 'text',
      senderType,
      senderId: senderId ? new Types.ObjectId(senderId) : undefined,
      senderName,
    });

    // Update conversation timestamps
    const now = new Date();
    if (!conversation.firstMessageAt) {
      conversation.firstMessageAt = now;
    }
    conversation.lastMessageAt = now;

    // If agent is responding, mark as assigned
    if (senderType === 'agent' && conversation.status === 'open') {
      conversation.status = 'assigned';
      if (senderId) {
        conversation.assignedTo = new Types.ObjectId(senderId);
      }
    }

    await conversation.save();

    return chatMessage;
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string, limit: number = 50) {
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return messages;
  }

  /**
   * Update visitor info in conversation
   */
  async updateVisitorInfo(
    conversationId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (data.name) conversation.visitorName = data.name;
    if (data.email) conversation.visitorEmail = data.email;
    if (data.phone) conversation.visitorPhone = data.phone;

    // If email provided, try to find or create contact
    if (data.email) {
      let contact = await Contact.findOne({
        workspaceId: conversation.workspaceId,
        email: data.email,
      });

      if (!contact) {
        // Create new contact
        contact = await Contact.create({
          workspaceId: conversation.workspaceId,
          email: data.email,
          firstName: data.name?.split(' ')[0] || 'Unknown',
          lastName: data.name?.split(' ').slice(1).join(' ') || '',
          phone: data.phone,
          source: 'Live Chat',
          status: 'lead',
        });

        // Enrich with company data from email domain
        if (data.email) {
          const companyData = await companyIdentificationService.enrichContactFromEmail(data.email);
          if (companyData) {
            conversation.companyName = companyData.name;
            conversation.companyDomain = companyData.domain;
            conversation.companyIndustry = companyData.industry;
            conversation.companySize = companyData.size;
          }
        }
      }

      conversation.contactId = contact._id as Types.ObjectId;

      // Link visitor to contact
      await Visitor.findOneAndUpdate(
        {
          workspaceId: conversation.workspaceId,
          visitorId: conversation.visitorId,
        },
        {
          contactId: contact._id,
        }
      );
    }

    await conversation.save();
    return conversation;
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string, rating?: number) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.status = 'closed';
    conversation.closedAt = new Date();
    if (rating) {
      conversation.rating = rating;
    }

    await conversation.save();
    return conversation;
  }

  /**
   * Assign conversation to agent
   */
  async assignConversation(conversationId: string, agentId: string) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.assignedTo = new Types.ObjectId(agentId);
    conversation.status = 'assigned';

    await conversation.save();
    return conversation;
  }

  /**
   * Get open conversations for workspace
   */
  async getOpenConversations(workspaceId: string, assignedTo?: string) {
    const query: any = {
      workspaceId,
      status: { $in: ['open', 'assigned', 'waiting'] },
    };

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .populate('contactId', 'firstName lastName email company')
      .populate('assignedTo', 'name email')
      .limit(50);

    return conversations;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, senderType: 'visitor' | 'agent') {
    // Mark all unread messages from the opposite sender as read
    const oppositeType = senderType === 'visitor' ? 'agent' : 'visitor';

    await ChatMessage.updateMany(
      {
        conversationId,
        senderType: oppositeType,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(workspaceId: string, forAgents: boolean = true) {
    const senderType = forAgents ? 'visitor' : 'agent';

    const count = await ChatMessage.countDocuments({
      workspaceId,
      senderType,
      isRead: false,
    });

    return count;
  }
}

export const chatService = new ChatService();
export default chatService;
