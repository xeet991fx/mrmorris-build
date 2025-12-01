"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, SparklesIcon, MinusIcon } from "@heroicons/react/24/outline";
import { useAgentStore } from "@/store/useAgentStore";
import { cn } from "@/lib/utils";
import AgentMessageList from "./AgentMessageList";
import AgentInputArea from "./AgentInputArea";
import AgentContextDisplay from "./AgentContextDisplay";

export default function AgentSidebar() {
  const { isOpen, isMinimized, toggleSidebar, minimize } = useAgentStore();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        toggleSidebar();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, toggleSidebar]);

  return (
    <>
      {/* Desktop sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={toggleSidebar}
            />

            {/* Sidebar */}
            <motion.aside
              ref={sidebarRef}
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 right-0 bottom-0 bg-card border-l border-border z-50 shadow-2xl flex flex-col",
                "w-full lg:w-[400px]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9ACD32] to-[#7BA428] flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-neutral-900" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      MrMorris AI
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Your AI Assistant
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={minimize}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Minimize"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Context Display */}
                  <AgentContextDisplay />

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto">
                    <AgentMessageList />
                  </div>

                  {/* Input Area */}
                  <AgentInputArea />
                </>
              )}

              {isMinimized && (
                <div className="flex-1 flex items-center justify-center p-8">
                  <button
                    onClick={minimize}
                    className="px-4 py-2 bg-[#9ACD32] text-neutral-900 rounded-lg hover:bg-[#8AB82E] transition-colors"
                  >
                    Restore Chat
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
