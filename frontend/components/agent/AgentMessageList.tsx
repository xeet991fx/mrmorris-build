"use client";

import { useEffect, useRef } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { motion, AnimatePresence } from "framer-motion";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";
import SystemMessage from "./SystemMessage";
import StreamingIndicator from "./StreamingIndicator";

export default function AgentMessageList() {
  const { messages, isLoading, isStreaming } = useAgentStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isStreaming]);

  return (
    <div
      ref={containerRef}
      className="h-full p-4 space-y-4"
    >
      <AnimatePresence mode="popLayout">
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9ACD32] to-[#7BA428] flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-neutral-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              MrMorris AI Assistant
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask me anything about your CRM data, or tell me what you'd like to do.
              I can help you create contacts, analyze data, and execute actions.
            </p>
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
            return (
              <SystemMessage
                key={message.id}
                message={message}
              />
            );
          }
        })}

        {(isLoading || isStreaming) && (
          <StreamingIndicator key="streaming" />
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  );
}
