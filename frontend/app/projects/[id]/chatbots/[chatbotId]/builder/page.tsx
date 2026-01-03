"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface ChatbotStep {
  id: string;
  type: "message" | "question" | "collect_info" | "condition" | "action" | "handoff";
  name: string;
  message?: string;
  questionType?: "text" | "email" | "phone" | "choice" | "rating";
  collectField?: "email" | "name" | "phone" | "company";
  choices?: Array<{ id: string; label: string; value: string }>;
  actionType?: string;
  actionConfig?: any;
  nextStepId?: string;
  position: { x: number; y: number };
}

interface Chatbot {
  _id: string;
  name: string;
  description?: string;
  status: string;
  steps: ChatbotStep[];
  settings: {
    botName?: string;
    brandColor?: string;
    welcomeMessage?: string;
  };
  trigger: {
    type: string;
    urlMatch?: string;
    urlPattern?: string;
  };
}

export default function ChatbotBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const chatbotId = params.chatbotId as string;

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    loadChatbot();
  }, [chatbotId]);

  const loadChatbot = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/${chatbotId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setChatbot(data.data);
      }
    } catch (error) {
      console.error("Load chatbot error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatbot = async () => {
    if (!chatbot) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/${chatbotId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(chatbot),
        }
      );

      if (response.ok) {
        alert("Chatbot saved successfully!");
      }
    } catch (error) {
      console.error("Save chatbot error:", error);
      alert("Failed to save chatbot");
    } finally {
      setIsSaving(false);
    }
  };

  const addStep = (type: ChatbotStep["type"]) => {
    if (!chatbot) return;

    const newStep: ChatbotStep = {
      id: `step_${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      position: { x: 100, y: (chatbot.steps.length + 1) * 100 },
    };

    if (type === "message") {
      newStep.message = "Enter your message here";
    } else if (type === "question" || type === "collect_info") {
      newStep.message = "Enter your question here";
      newStep.questionType = "text";
    } else if (type === "choice") {
      newStep.questionType = "choice";
      newStep.choices = [
        { id: "1", label: "Option 1", value: "option1" },
        { id: "2", label: "Option 2", value: "option2" },
      ];
    }

    setChatbot({
      ...chatbot,
      steps: [...chatbot.steps, newStep],
    });
  };

  const updateStep = (stepId: string, updates: Partial<ChatbotStep>) => {
    if (!chatbot) return;

    setChatbot({
      ...chatbot,
      steps: chatbot.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    });
  };

  const deleteStep = (stepId: string) => {
    if (!chatbot) return;

    if (!confirm("Are you sure you want to delete this step?")) return;

    setChatbot({
      ...chatbot,
      steps: chatbot.steps.filter((step) => step.id !== stepId),
    });
  };

  const moveStep = (stepId: string, direction: "up" | "down") => {
    if (!chatbot) return;

    const index = chatbot.steps.findIndex((s) => s.id === stepId);
    if (index === -1) return;

    const newSteps = [...chatbot.steps];

    if (direction === "up" && index > 0) {
      [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
    } else if (direction === "down" && index < newSteps.length - 1) {
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    }

    setChatbot({
      ...chatbot,
      steps: newSteps,
    });
  };

  const activateChatbot = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/chatbots/${chatbotId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: "active" }),
        }
      );

      if (response.ok) {
        loadChatbot();
        alert("Chatbot activated!");
      }
    } catch (error) {
      console.error("Activate error:", error);
    }
  };

  if (isLoading || !chatbot) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <input
                  type="text"
                  value={chatbot.name}
                  onChange={(e) =>
                    setChatbot({ ...chatbot, name: e.target.value })
                  }
                  className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-600 rounded px-2 dark:text-white"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {chatbot.steps.length} steps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm rounded-full font-medium ${
                  chatbot.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {chatbot.status}
              </span>
              <button
                onClick={saveChatbot}
                disabled={isSaving}
                className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              {chatbot.status !== "active" && (
                <button
                  onClick={activateChatbot}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <PlayIcon className="w-4 h-4" />
                  Activate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Settings */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bot Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    value={chatbot.settings.botName || ""}
                    onChange={(e) =>
                      setChatbot({
                        ...chatbot,
                        settings: { ...chatbot.settings, botName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Assistant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    value={chatbot.settings.welcomeMessage || ""}
                    onChange={(e) =>
                      setChatbot({
                        ...chatbot,
                        settings: {
                          ...chatbot.settings,
                          welcomeMessage: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Hi! How can I help you?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Brand Color
                  </label>
                  <input
                    type="color"
                    value={chatbot.settings.brandColor || "#667eea"}
                    onChange={(e) =>
                      setChatbot({
                        ...chatbot,
                        settings: { ...chatbot.settings, brandColor: e.target.value },
                      })
                    }
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center - Steps Builder */}
          <div className="col-span-9">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Conversation Flow
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addStep("message")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    + Message
                  </button>
                  <button
                    onClick={() => addStep("collect_info")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    + Ask Question
                  </button>
                  <button
                    onClick={() => addStep("handoff")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    + Handoff
                  </button>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {chatbot.steps.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No steps yet. Add your first step to start building!
                    </p>
                    <button
                      onClick={() => addStep("message")}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                    >
                      <PlusIcon className="w-5 h-5 inline mr-2" />
                      Add First Step
                    </button>
                  </div>
                ) : (
                  chatbot.steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm font-medium rounded">
                              Step {index + 1}: {step.type}
                            </span>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) =>
                                updateStep(step.id, { name: e.target.value })
                              }
                              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => moveStep(step.id, "up")}
                            disabled={index === 0}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveStep(step.id, "down")}
                            disabled={index === chatbot.steps.length - 1}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => deleteStep(step.id)}
                            className="p-2 text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Step Content */}
                      {(step.type === "message" ||
                        step.type === "question" ||
                        step.type === "collect_info") && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Message
                            </label>
                            <textarea
                              value={step.message || ""}
                              onChange={(e) =>
                                updateStep(step.id, { message: e.target.value })
                              }
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-600 dark:bg-gray-800 dark:text-white"
                              placeholder="Enter bot message..."
                            />
                          </div>

                          {step.type === "collect_info" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Collect Field
                              </label>
                              <select
                                value={step.collectField || "email"}
                                onChange={(e) =>
                                  updateStep(step.id, {
                                    collectField: e.target.value as any,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                              >
                                <option value="email">Email</option>
                                <option value="name">Name</option>
                                <option value="phone">Phone</option>
                                <option value="company">Company</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {step.type === "handoff" && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            🤝 This step will hand off the conversation to a human
                            agent.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
