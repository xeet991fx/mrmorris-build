"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";

interface Message {
  _id: string;
  message: string;
  senderType: "visitor" | "agent" | "system";
  senderName?: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  _id: string;
  status: "open" | "closed" | "assigned" | "waiting";
  visitorName?: string;
  visitorEmail?: string;
  contactId?: {
    firstName?: string;
    lastName?: string;
    email: string;
    company?: string;
  };
  companyName?: string;
  companySize?: string;
  companyLocation?: string;
  currentUrl?: string;
  lastMessageAt: string;
  createdAt: string;
  assignedTo?: {
    _id: string;
    name: string;
  };
}

export default function ChatPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  // Initialize Socket.IO
  useEffect(() => {
    const newSocket = io(`${backendUrl}/chat/admin`, {
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("✅ Admin chat connected");
      newSocket.emit("join:workspace", { workspaceId });
    });

    newSocket.on("visitor:joined", (data) => {
      console.log("New visitor joined:", data.conversation);
      loadConversations();
    });

    newSocket.on("message:new", (message) => {
      console.log("New message:", message);

      // Add to messages if in current conversation
      if (selectedConversation && message.conversationId === selectedConversation._id) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }

      // Update conversation list
      loadConversations();
    });

    newSocket.on("conversation:assigned", () => {
      loadConversations();
    });

    newSocket.on("conversation:closed", () => {
      loadConversations();
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [workspaceId]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chat/conversations?status=open&status=assigned&status=waiting`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error("Load conversations error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversation messages
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chat/conversations/${conversationId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages);
        setSelectedConversation(data.data.conversation);

        // Join conversation room via socket
        if (socket) {
          socket.emit("join:conversation", { conversationId });

          // Mark messages as read
          socket.emit("messages:read", { conversationId });
        }

        scrollToBottom();
      }
    } catch (error) {
      console.error("Load messages error:", error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !socket) return;

    const message = messageInput.trim();
    setMessageInput("");

    // Send via socket
    socket.emit("message:send", {
      conversationId: selectedConversation._id,
      message,
      agentId: "current_user_id", // TODO: Get from auth context
      agentName: "Support Agent", // TODO: Get from auth context
    });
  };

  // Close conversation
  const closeConversation = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chat/conversations/${selectedConversation._id}/close`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (response.ok) {
        setSelectedConversation(null);
        setMessages([]);
        loadConversations();
      }
    } catch (error) {
      console.error("Close conversation error:", error);
    }
  };

  // Assign to me
  const assignToMe = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chat/conversations/${selectedConversation._id}/assign`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ agentId: "current_user_id" }), // TODO: Get from auth
        }
      );

      if (response.ok) {
        loadConversations();
        loadMessages(selectedConversation._id);
      }
    } catch (error) {
      console.error("Assign conversation error:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    loadConversations();
  }, [workspaceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getDisplayName = (conversation: Conversation) => {
    if (conversation.contactId) {
      return `${conversation.contactId.firstName || ""} ${conversation.contactId.lastName || ""}`.trim() || conversation.contactId.email;
    }
    return conversation.visitorName || conversation.visitorEmail || "Anonymous Visitor";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-800";
      case "assigned": return "bg-blue-100 text-blue-800";
      case "waiting": return "bg-yellow-100 text-yellow-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-gray-400 animate-pulse" />
          <p className="mt-2 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversation List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
            Live Chat
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {conversations.length} active {conversations.length === 1 ? "conversation" : "conversations"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-600">No active conversations</p>
              <p className="text-sm text-gray-500 mt-2">
                New chats will appear here
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => loadMessages(conv._id)}
                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                  selectedConversation?._id === conv._id ? "bg-purple-50 border-l-4 border-purple-600" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {getDisplayName(conv)}
                    </h3>
                    {conv.companyName && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <BuildingOfficeIcon className="w-3 h-3" />
                        {conv.companyName}
                      </p>
                    )}
                    {conv.companyLocation && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3" />
                        {conv.companyLocation}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(conv.status)}`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="w-10 h-10 text-gray-400" />
              <div>
                <h2 className="font-semibold text-gray-900">
                  {getDisplayName(selectedConversation)}
                </h2>
                {selectedConversation.contactId?.email && (
                  <p className="text-sm text-gray-600">{selectedConversation.contactId.email}</p>
                )}
                {selectedConversation.companyName && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <BuildingOfficeIcon className="w-3 h-3" />
                    {selectedConversation.companyName}
                    {selectedConversation.companySize && ` • ${selectedConversation.companySize} employees`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedConversation.status === "open" && (
                <button
                  onClick={assignToMe}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Assign to Me
                </button>
              )}
              <button
                onClick={closeConversation}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((msg) => {
              const isAgent = msg.senderType === "agent";
              return (
                <div
                  key={msg._id}
                  className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] ${isAgent ? "items-end" : "items-start"} flex flex-col`}>
                    {!isAgent && msg.senderName && (
                      <span className="text-xs text-gray-600 mb-1 px-2">{msg.senderName}</span>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isAgent
                          ? "bg-purple-600 text-white rounded-br-sm"
                          : "bg-white text-gray-900 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 px-2">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <ChatBubbleLeftRightIcon className="w-20 h-20 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No conversation selected</h3>
            <p className="mt-2 text-gray-600">
              Select a conversation from the list to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
