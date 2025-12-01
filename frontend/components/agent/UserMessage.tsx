"use client";

import { motion } from "framer-motion";
import { AgentMessage } from "@/store/useAgentStore";
import { UserCircleIcon } from "@heroicons/react/24/solid";

interface UserMessageProps {
  message: AgentMessage;
  isLatest: boolean;
}

export default function UserMessage({ message, isLatest }: UserMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9ACD32] flex items-center justify-center">
        <UserCircleIcon className="w-6 h-6 text-neutral-900" />
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">You</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="bg-[#9ACD32] text-neutral-900 rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
