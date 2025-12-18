"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { sendAgentMessage, getAgentStatus } from "@/lib/api/agent";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolResults?: Record<string, any>;
}

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { currentWorkspace, fetchWorkspace } = useWorkspaceStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<{
    status: string;
    model: string;
    agents: { name: string; description: string }[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load workspace and agent status
  useEffect(() => {
    if (!workspaceId) return;

    const loadData = async () => {
      try {
        await fetchWorkspace(workspaceId);

        // Get agent status
        const statusRes = await getAgentStatus(workspaceId);
        if (statusRes.success && statusRes.data) {
          setAgentInfo({
            status: statusRes.data.status,
            model: statusRes.data.model,
            agents: statusRes.data.availableAgents,
          });
        }
      } catch (error) {
        console.error("Failed to load:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [workspaceId, fetchWorkspace]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendAgentMessage(workspaceId, userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data?.response || "Sorry, I couldn't process that.",
        timestamp: new Date(),
        toolResults: response.data?.toolResults,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error.message || "Failed to get response"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestedPrompts = [
    "Create a contact named John Smith from Acme Corp",
    "Search for contacts at Google",
    "Get my pipeline summary",
    "List all workflows",
  ];

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {currentWorkspace?.name || "Workspace"} - AI Assistant
            </h1>
            {agentInfo && (
              <p className="text-sm text-gray-500">
                {agentInfo.model} • {agentInfo.agents.length} agents available
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {agentInfo?.agents.map((agent) => (
              <span
                key={agent.name}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize"
              >
                {agent.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                👋 Hi! I'm your CRM Assistant
              </h2>
              <p className="text-gray-600 mb-8">
                I can help you with contacts, emails, deals, and workflows.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(prompt)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-900"
                    }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.toolResults && (
                    <div className="mt-2 pt-2 border-t border-gray-200/20 text-xs opacity-70">
                      Tools used: {Object.keys(message.toolResults).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
                  <span className="ml-2 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-100 rounded-xl p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about contacts, deals, or workflows..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-3 py-2 bg-transparent border-0 resize-none focus:outline-none disabled:opacity-50 text-sm"
              style={{ minHeight: "40px", maxHeight: "120px" }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
