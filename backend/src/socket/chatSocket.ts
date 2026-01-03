import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { chatService } from '../services/ChatService';
import chatbotService from '../services/ChatbotService';
import Conversation from '../models/Conversation';

export function initializeChatSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Namespace for visitor chat
  const visitorNamespace = io.of('/chat/visitor');

  // Namespace for admin/agent chat
  const adminNamespace = io.of('/chat/admin');

  /**
   * VISITOR CHAT SOCKET
   * Handles communication from website visitors
   */
  visitorNamespace.on('connection', (socket) => {
    console.log(`✅ Visitor connected: ${socket.id}`);

    let currentConversationId: string | null = null;
    let currentWorkspaceId: string | null = null;
    let currentChatbotId: string | null = null;
    let chatbotContext: Map<string, any> = new Map(); // Store chatbot responses
    let chatbotVariables: Map<string, any> = new Map(); // Store collected variables
    let currentChatbotStepId: string | null = null;

    // Join conversation room
    socket.on('join', async (data: {
      workspaceId: string;
      visitorId: string;
      url?: string;
      referrer?: string;
      userAgent?: string;
      ipAddress?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    }) => {
      try {
        // Get or create conversation
        const conversation = await chatService.getOrCreateConversation(
          data.workspaceId,
          data.visitorId,
          {
            url: data.url,
            referrer: data.referrer,
            userAgent: data.userAgent,
            ipAddress: socket.handshake.address,
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
          }
        );

        currentConversationId = conversation._id.toString();
        currentWorkspaceId = data.workspaceId;

        // Join room for this conversation
        socket.join(`conversation:${currentConversationId}`);

        // Send conversation history
        const messages = await chatService.getMessages(currentConversationId);

        socket.emit('conversation:joined', {
          conversationId: currentConversationId,
          messages,
        });

        // Notify admins of new visitor
        adminNamespace.to(`workspace:${data.workspaceId}`).emit('visitor:joined', {
          conversation,
        });

        // Check if chatbot should trigger
        const chatbot = await chatbotService.getActiveChatbot(data.workspaceId);
        if (chatbot && chatbotService.shouldTriggerBot(chatbot, { url: data.url })) {
          currentChatbotId = chatbot._id.toString();

          // Initialize chatbot (send first message)
          const botResponse = await chatbotService.initializeChatbot(
            currentChatbotId,
            currentConversationId,
            data.workspaceId
          );

          if (botResponse) {
            currentChatbotStepId = botResponse.step.id;

            // Send bot message to visitor
            socket.emit('message:new', botResponse.message);

            // Notify admins
            adminNamespace.to(`conversation:${currentConversationId}`).emit('message:new', botResponse.message);
          }
        }

        console.log(`Visitor joined conversation: ${currentConversationId}`);
      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Send message from visitor
    socket.on('message:send', async (data: {
      message: string;
      senderName?: string;
    }) => {
      try {
        if (!currentConversationId) {
          return socket.emit('error', { message: 'Not in a conversation' });
        }

        // Save visitor message
        const chatMessage = await chatService.sendMessage(
          currentConversationId,
          'visitor',
          data.message,
          undefined,
          data.senderName || 'Visitor'
        );

        // Send to visitor
        socket.emit('message:sent', chatMessage);

        // Send to admins
        adminNamespace.to(`conversation:${currentConversationId}`).emit('message:new', chatMessage);

        // Process message through chatbot if active
        if (currentChatbotId && currentChatbotStepId && currentWorkspaceId) {
          // Add small delay to simulate typing
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Process user response
          const botResponse = await chatbotService.processResponse(
            currentChatbotId,
            currentChatbotStepId,
            data.message,
            currentConversationId,
            currentWorkspaceId,
            chatbotContext,
            chatbotVariables
          );

          if (botResponse) {
            currentChatbotStepId = botResponse.step.id;

            // Send bot message to visitor
            socket.emit('message:new', botResponse.message);

            // Notify admins
            adminNamespace.to(`conversation:${currentConversationId}`).emit('message:new', botResponse.message);
          } else {
            // Chatbot conversation ended (handoff or complete)
            currentChatbotId = null;
            currentChatbotStepId = null;
            chatbotContext.clear();
            chatbotVariables.clear();
          }
        }

        console.log(`Message sent in conversation ${currentConversationId}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Visitor provides contact info
    socket.on('visitor:identify', async (data: {
      name?: string;
      email?: string;
      phone?: string;
    }) => {
      try {
        if (!currentConversationId) {
          return socket.emit('error', { message: 'Not in a conversation' });
        }

        const conversation = await chatService.updateVisitorInfo(
          currentConversationId,
          data
        );

        socket.emit('visitor:identified', { conversation });

        // Notify admins
        adminNamespace.to(`conversation:${currentConversationId}`).emit('visitor:identified', {
          conversation,
        });

        console.log(`Visitor identified in conversation ${currentConversationId}:`, data.email);
      } catch (error) {
        console.error('Identify visitor error:', error);
        socket.emit('error', { message: 'Failed to update info' });
      }
    });

    // Mark messages as read
    socket.on('messages:read', async () => {
      try {
        if (!currentConversationId) return;

        await chatService.markAsRead(currentConversationId, 'visitor');

        adminNamespace.to(`conversation:${currentConversationId}`).emit('messages:read', {
          conversationId: currentConversationId,
        });
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });

    // Close conversation
    socket.on('conversation:close', async (data: { rating?: number }) => {
      try {
        if (!currentConversationId) return;

        await chatService.closeConversation(currentConversationId, data.rating);

        socket.emit('conversation:closed');

        adminNamespace.to(`conversation:${currentConversationId}`).emit('conversation:closed', {
          conversationId: currentConversationId,
        });

        console.log(`Conversation closed: ${currentConversationId}`);
      } catch (error) {
        console.error('Close conversation error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Visitor disconnected: ${socket.id}`);
    });
  });

  /**
   * ADMIN CHAT SOCKET
   * Handles communication for agents/admins
   */
  adminNamespace.on('connection', (socket) => {
    console.log(`✅ Admin connected: ${socket.id}`);

    // Join workspace room
    socket.on('join:workspace', (data: { workspaceId: string }) => {
      socket.join(`workspace:${data.workspaceId}`);
      console.log(`Admin joined workspace: ${data.workspaceId}`);
    });

    // Join specific conversation
    socket.on('join:conversation', (data: { conversationId: string }) => {
      socket.join(`conversation:${data.conversationId}`);
      console.log(`Admin joined conversation: ${data.conversationId}`);
    });

    // Send message from admin
    socket.on('message:send', async (data: {
      conversationId: string;
      message: string;
      agentId: string;
      agentName: string;
    }) => {
      try {
        const chatMessage = await chatService.sendMessage(
          data.conversationId,
          'agent',
          data.message,
          data.agentId,
          data.agentName
        );

        // Send to admin
        socket.emit('message:sent', chatMessage);

        // Send to visitor
        visitorNamespace.to(`conversation:${data.conversationId}`).emit('message:new', chatMessage);

        // Send to other admins in this conversation
        socket.to(`conversation:${data.conversationId}`).emit('message:new', chatMessage);

        console.log(`Admin message sent in conversation ${data.conversationId}`);
      } catch (error) {
        console.error('Admin send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Assign conversation
    socket.on('conversation:assign', async (data: {
      conversationId: string;
      agentId: string;
    }) => {
      try {
        const conversation = await chatService.assignConversation(
          data.conversationId,
          data.agentId
        );

        adminNamespace.to(`workspace:${conversation.workspaceId}`).emit('conversation:assigned', {
          conversation,
        });

        console.log(`Conversation assigned: ${data.conversationId} to ${data.agentId}`);
      } catch (error) {
        console.error('Assign conversation error:', error);
        socket.emit('error', { message: 'Failed to assign conversation' });
      }
    });

    // Mark messages as read
    socket.on('messages:read', async (data: { conversationId: string }) => {
      try {
        await chatService.markAsRead(data.conversationId, 'agent');

        visitorNamespace.to(`conversation:${data.conversationId}`).emit('messages:read', {
          conversationId: data.conversationId,
        });
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Admin disconnected: ${socket.id}`);
    });
  });

  console.log('🚀 Chat Socket.IO initialized');

  return io;
}

export default initializeChatSocket;
