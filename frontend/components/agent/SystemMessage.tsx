"use client";

import { motion } from "framer-motion";
import { AgentMessage } from "@/store/useAgentStore";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

interface SystemMessageProps {
  message: AgentMessage;
}

export default function SystemMessage({ message }: SystemMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="flex items-center justify-center py-2"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-full text-xs text-muted-foreground">
        <InformationCircleIcon className="w-4 h-4" />
        <span>{message.content}</span>
      </div>
    </motion.div>
  );
}
