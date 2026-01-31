'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { useCopilotStore } from '@/store/useCopilotStore';

interface CopilotChatPanelProps {
  workspaceId: string;
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CopilotChatPanel({
  workspaceId,
  agentId,
  isOpen,
  onClose,
}: CopilotChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use separate selectors to avoid creating new objects on every render
  const conversationMessages = useCopilotStore((state) => state.conversations[agentId]);
  const isStreaming = useCopilotStore((state) => state.isStreaming[agentId] || false);
  const validationWarnings = useCopilotStore((state) => state.validationWarnings[workspaceId] || []);
  const loadHistoryFn = useCopilotStore((state) => state.loadHistory);
  const sendMessageFn = useCopilotStore((state) => state.sendMessage);
  const clearConversationFn = useCopilotStore((state) => state.clearConversation);
  const applyInstructionsFn = useCopilotStore((state) => state.applyInstructions);

  // Memoize messages array to prevent unnecessary re-renders
  const messages = useMemo(() => conversationMessages || [], [conversationMessages]);

  // Memoize callbacks
  const loadHistory = useCallback(
    (workspaceId: string, agentId: string) => loadHistoryFn(workspaceId, agentId),
    [loadHistoryFn]
  );

  const sendMessage = useCallback(
    (workspaceId: string, agentId: string, message: string) =>
      sendMessageFn(workspaceId, agentId, message),
    [sendMessageFn]
  );

  const clearConversation = useCallback(
    (workspaceId: string, agentId: string) => clearConversationFn(workspaceId, agentId),
    [clearConversationFn]
  );

  // Load history when panel opens
  useEffect(() => {
    if (isOpen && agentId) {
      loadHistory(workspaceId, agentId);
    }
  }, [isOpen, workspaceId, agentId, loadHistory]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (message: string) => {
    if (message.trim()) {
      sendMessage(workspaceId, agentId, message);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear conversation history?')) {
      await clearConversation(workspaceId, agentId);
    }
  };

  const handleApplyInstructions = useCallback(
    (instructions: string) => {
      applyInstructionsFn(agentId, instructions);
    },
    [applyInstructionsFn, agentId]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Copilot
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your agent building assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            warnings={validationWarnings}
            onApplyInstructions={handleApplyInstructions}
          />
        ))}
        {isStreaming && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder="Ask about agent building..."
        />
      </div>
    </div>
  );
}
