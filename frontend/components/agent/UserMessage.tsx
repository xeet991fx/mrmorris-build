"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { AgentMessage } from "@/store/useAgentStore";

interface UserMessageProps {
  message: AgentMessage;
  isLatest: boolean;
}

const UserMessage = forwardRef<HTMLDivElement, UserMessageProps>(({ message, isLatest }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="py-6 border-b border-border/50"
    >
      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">You</span>
        </div>
        <p className="text-base text-foreground whitespace-pre-wrap break-words pt-0.5">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
});

UserMessage.displayName = "UserMessage";

export default UserMessage;
