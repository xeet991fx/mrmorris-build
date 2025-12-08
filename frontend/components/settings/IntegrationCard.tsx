"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  status: "connected" | "not-connected" | "coming-soon";
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  delay?: number;
}

export default function IntegrationCard({
  title,
  description,
  icon,
  status,
  isExpanded,
  onToggle,
  children,
  delay = 0,
}: IntegrationCardProps) {
  const statusConfig = {
    connected: {
      badge: "Connected",
      className: "bg-green-500/10 text-green-400",
    },
    "not-connected": {
      badge: "Not Connected",
      className: "bg-muted text-muted-foreground",
    },
    "coming-soon": {
      badge: "Coming Soon",
      className: "bg-blue-500/10 text-blue-400",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-lg border border-border bg-card/50 overflow-hidden"
    >
      {/* Card Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-card/70 transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0">{icon}</div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <span
                className={`px-2 py-0.5 text-[10px] font-medium rounded ${currentStatus.className}`}
              >
                {currentStatus.badge}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Chevron Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-muted-foreground transition-transform" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-muted-foreground transition-transform" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? "auto" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{
          height: { duration: 0.3, ease: "easeInOut" },
          opacity: { duration: 0.2, ease: "easeInOut" },
        }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 pt-2 border-t border-border">{children}</div>
      </motion.div>
    </motion.div>
  );
}
