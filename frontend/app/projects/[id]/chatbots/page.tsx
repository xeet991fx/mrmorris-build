"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface Chatbot {
  _id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "archived";
  stats: {
    totalConversations: number;
    completedConversations: number;
    leadsGenerated: number;
    avgCompletionRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ChatbotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function ChatbotsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [templates, setTemplates] = useState<ChatbotTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    loadChatbots();
    loadTemplates();
  }, [workspaceId]);

  const loadChatbots = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setChatbots(data.data);
      }
    } catch (error) {
      console.error("Load chatbots error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbot-templates`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("Load templates error:", error);
    }
  };

  const createBlankChatbot = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: "New Chatbot",
            description: "",
            userId: "default_user_id", // TODO: Get from auth
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        router.push(`/projects/${workspaceId}/chatbots/${data.data._id}/builder`);
      }
    } catch (error) {
      console.error("Create chatbot error:", error);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/from-template`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            templateId,
            userId: "default_user_id", // TODO: Get from auth
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        router.push(`/projects/${workspaceId}/chatbots/${data.data._id}/builder`);
      }
    } catch (error) {
      console.error("Create from template error:", error);
    }
  };

  const updateStatus = async (chatbotId: string, status: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/${chatbotId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        loadChatbots();
      }
    } catch (error) {
      console.error("Update status error:", error);
    }
  };

  const deleteChatbot = async (chatbotId: string) => {
    if (!confirm("Are you sure you want to delete this chatbot?")) return;

    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/${chatbotId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        loadChatbots();
      }
    } catch (error) {
      console.error("Delete chatbot error:", error);
    }
  };

  const duplicateChatbot = async (chatbotId: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/${chatbotId}/duplicate`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        loadChatbots();
      }
    } catch (error) {
      console.error("Duplicate chatbot error:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-600" />
              Chatbots
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Automate lead qualification 24/7 with AI-powered chatbots
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            >
              Use Template
            </button>
            <button
              onClick={createBlankChatbot}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Chatbot
            </button>
          </div>
        </div>
      </div>

      {/* Chatbots Grid */}
      {chatbots.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No chatbots yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first chatbot to start automating lead capture
          </p>
          <button
            onClick={createBlankChatbot}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create Your First Chatbot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((chatbot) => (
            <motion.div
              key={chatbot._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
                    {chatbot.name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                      chatbot.status
                    )}`}
                  >
                    {chatbot.status}
                  </span>
                </div>
                {chatbot.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {chatbot.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {chatbot.stats.totalConversations}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Conversations
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {chatbot.stats.leadsGenerated}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Leads Generated
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {chatbot.stats.avgCompletionRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Completion Rate
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {chatbot.stats.completedConversations}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Completed
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() =>
                    router.push(`/projects/${workspaceId}/chatbots/${chatbot._id}/builder`)
                  }
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
                {chatbot.status === "active" ? (
                  <button
                    onClick={() => updateStatus(chatbot._id, "paused")}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                    title="Pause"
                  >
                    <PauseIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(chatbot._id, "active")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    title="Activate"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => duplicateChatbot(chatbot._id)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  title="Duplicate"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteChatbot(chatbot._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose a Template
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Start with a pre-built chatbot flow
              </p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    createFromTemplate(template.id);
                    setShowTemplateModal(false);
                  }}
                  className="text-left p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-600 dark:hover:border-purple-600 transition-colors"
                >
                  <div className="text-4xl mb-3">{template.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
