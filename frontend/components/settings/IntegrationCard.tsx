"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  status: "connected" | "not-connected" | "coming-soon" | "expiring" | "expired" | "error";
  expiresInDays?: number; // For expiring status
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
  expiresInDays,
  isExpanded,
  onToggle,
  children,
  delay = 0,
}: IntegrationCardProps) {
  const statusConfig = {
    connected: {
      badge: "Connected",
      className: "bg-emerald-500/10 text-emerald-400",
    },
    "not-connected": {
      badge: "Not Connected",
      className: "bg-zinc-500/10 text-zinc-400",
    },
    "coming-soon": {
      badge: "Coming Soon",
      className: "bg-blue-500/10 text-blue-400",
    },
    expiring: {
      badge: expiresInDays ? `Expires in ${expiresInDays} day${expiresInDays > 1 ? 's' : ''}` : "Expiring Soon",
      className: "bg-amber-500/10 text-amber-400 animate-pulse",
    },
    expired: {
      badge: "Expired - Reconnect",
      className: "bg-red-500/10 text-red-400",
    },
    error: {
      badge: "Error - Reconnect",
      className: "bg-red-500/10 text-red-400",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 30 }}
      className="group rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-500"
    >
      {/* Card Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-card/30 transition-all duration-300 text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0">{icon}</div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <span
                className={cn(
                  "px-2.5 py-0.5 text-[10px] font-medium rounded-full",
                  currentStatus.className
                )}
              >
                {currentStatus.badge}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Chevron Icon with rotation animation */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-shrink-0 p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5" />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
