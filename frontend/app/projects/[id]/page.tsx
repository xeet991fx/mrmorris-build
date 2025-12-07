"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpIcon } from "@heroicons/react/24/outline";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useAgentStore } from "@/store/useAgentStore";
import { useAgentContextSync } from "@/lib/hooks/useAgentContextSync";
import UserMessage from "@/components/agent/UserMessage";
import AssistantMessage from "@/components/agent/AssistantMessage";
import SystemMessage from "@/components/agent/SystemMessage";
import StreamingIndicator from "@/components/agent/StreamingIndicator";

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { currentWorkspace, fetchWorkspace } = useWorkspaceStore();
  const { messages, isLoading, isStreaming, sendMessage, clearConversation } = useAgentStore();

  const [input, setInput] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync agent context
  useAgentContextSync(currentWorkspace?.name, "dashboard");

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
          <div className="flex items-center gap-3 bg-muted rounded-xl p-1.5 pl-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message Clianta..."
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
