"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpIcon, BoltIcon, ShieldCheckIcon, SparklesIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useAgentStore, AIModel } from "@/store/useAgentStore";
import UserMessage from "@/components/agent/UserMessage";
import AssistantMessage from "@/components/agent/AssistantMessage";
import SystemMessage from "@/components/agent/SystemMessage";
import StreamingIndicator from "@/components/agent/StreamingIndicator";
import toast from "react-hot-toast";

// Model options
const MODEL_OPTIONS: { value: AIModel; label: string; provider: 'gemini' | 'openai' }[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
];

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { currentWorkspace, fetchWorkspace } = useWorkspaceStore();
  const {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    clearConversation,
    autonomousMode,
    toggleAutonomousMode,
    selectedModel,
    setSelectedModel,
  } = useAgentStore();

  const [input, setInput] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    const loadWorkspace = async () => {
      try {
        await fetchWorkspace(workspaceId);
        if (!cancelled) setIsInitialLoading(false);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch workspace:", error);
          setIsInitialLoading(false);
        }
      }
    };

    loadWorkspace();
    return () => { cancelled = true; };
  }, [workspaceId, fetchWorkspace]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStreaming]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || isStreaming) return;
    const message = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      await sendMessage(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleToggleAutonomous = () => {
    toggleAutonomousMode();
    toast.success(
      autonomousMode
        ? "Confirmation Mode - Actions will require approval"
        : "Autonomous Mode - Actions will execute automatically"
    );
  };

  const handleModelChange = (model: AIModel) => {
    setSelectedModel(model);
    const modelInfo = MODEL_OPTIONS.find(m => m.value === model);
    toast.success(`Switched to ${modelInfo?.label || model}`);
  };

  const currentModelInfo = MODEL_OPTIONS.find(m => m.value === selectedModel);

  if (isInitialLoading || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const suggestedPrompts = [
    "Show me today's pipeline",
    "Who are my hottest leads?",
    "Create a follow-up task",
    "Deals closing this month",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <h1 className="text-4xl font-semibold text-foreground mb-3">
                  What can I help with?
                </h1>
                <p className="text-muted-foreground mb-12">
                  Ask about contacts, deals, or your pipeline
                </p>

                {/* Suggested Prompts */}
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(prompt);
                        textareaRef.current?.focus();
                      }}
                      className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-full hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => {
              if (message.role === "user") {
                return (
                  <UserMessage
                    key={message.id}
                    message={message}
                    isLatest={index === messages.length - 1}
                  />
                );
              } else if (message.role === "assistant") {
                return (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    isLatest={index === messages.length - 1}
                  />
                );
              } else {
                return <SystemMessage key={message.id} message={message} />;
              }
            })}

            {(isLoading || isStreaming) && <StreamingIndicator key="streaming" />}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-background pb-6 pt-4">
        <div className="max-w-2xl mx-auto px-6">
          {/* Controls Row: Autonomous Mode + Model Selector */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            {/* Autonomous Mode Toggle */}
            <button
              onClick={handleToggleAutonomous}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${autonomousMode
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-500/30"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-500/30"
                }`}
              title={autonomousMode
                ? "Autonomous Mode: Agent executes actions automatically"
                : "Confirmation Mode: Agent asks before executing actions"
              }
            >
              {autonomousMode ? (
                <>
                  <BoltIcon className="w-3.5 h-3.5" />
                  <span>Autonomous</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  <span>Confirmation</span>
                </>
              )}
            </button>

            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Model:</span>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value as AIModel)}
                  className={`appearance-none pl-7 pr-6 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 ${currentModelInfo?.provider === 'gemini'
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-500/30 focus:ring-purple-500"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-green-500/30 focus:ring-green-500"
                    }`}
                >
                  <optgroup label="Google Gemini">
                    {MODEL_OPTIONS.filter(m => m.provider === 'gemini').map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="OpenAI">
                    {MODEL_OPTIONS.filter(m => m.provider === 'openai').map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {/* Provider Icon */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  {currentModelInfo?.provider === 'gemini' ? (
                    <SparklesIcon className="w-3.5 h-3.5" />
                  ) : (
                    <CpuChipIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                {/* Dropdown Arrow */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-3 bg-muted rounded-xl p-1.5 pl-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={autonomousMode
                ? "Ask me to do anything... I'll execute it automatically"
                : "Message Mr Morris..."
              }
              disabled={isLoading || isStreaming}
              rows={1}
              className="flex-1 py-2 bg-transparent border-0 resize-none focus:outline-none disabled:opacity-50 text-sm text-foreground placeholder:text-muted-foreground"
              style={{ minHeight: "36px", maxHeight: "120px" }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || isStreaming}
              className="flex-shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUpIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

