"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function AgentInputArea() {
  const { sendMessage, isLoading, isStreaming, clearConversation, messages } = useAgentStore();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const message = input.trim();
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await sendMessage(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearConversation = () => {
    if (messages.length === 0) return;

    if (confirm("Are you sure you want to clear the conversation?")) {
      clearConversation();
      toast.success("Conversation cleared");
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  return (
    <div className="border-t border-border bg-card flex-shrink-0">
      <div className="p-4">
        <div className="relative flex items-end gap-2">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading || isStreaming}
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm text-foreground placeholder:text-muted-foreground"
              style={{ minHeight: "44px", maxHeight: "150px" }}
            />
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || isStreaming}
            className="p-3 bg-[#9ACD32] text-neutral-900 rounded-lg hover:bg-[#8AB82E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </motion.button>

          {/* Clear Conversation Button */}
          {messages.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClearConversation}
              disabled={isLoading || isStreaming}
              className="p-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Clear conversation"
            >
              <TrashIcon className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Hint text */}
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
