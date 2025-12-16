"use client";

import { motion } from "framer-motion";
import { SparklesIcon, CpuChipIcon, ListBulletIcon, WrenchScrewdriverIcon, UserGroupIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/solid";
import { getToolDescription, getSubagentDisplayName } from "@/lib/api/agent";

interface ThinkingIndicatorProps {
    phase: "idle" | "thinking" | "planning" | "executing" | "responding";
    toolName?: string;
    subagentName?: string;
}

export default function ThinkingIndicator({ phase, toolName, subagentName }: ThinkingIndicatorProps) {
    const getPhaseContent = () => {
        switch (phase) {
            case "thinking":
                return {
                    icon: <CpuChipIcon className="w-4 h-4" />,
                    text: "Thinking...",
                    color: "text-blue-500",
                    bgColor: "bg-blue-100 dark:bg-blue-900/30",
                };

            case "planning":
                return {
                    icon: <ListBulletIcon className="w-4 h-4" />,
                    text: "Creating plan...",
                    color: "text-amber-500",
                    bgColor: "bg-amber-100 dark:bg-amber-900/30",
                };

            case "executing":
                if (subagentName) {
                    return {
                        icon: <UserGroupIcon className="w-4 h-4" />,
                        text: `${getSubagentDisplayName(subagentName)} working...`,
                        color: "text-purple-500",
                        bgColor: "bg-purple-100 dark:bg-purple-900/30",
                    };
                }
                if (toolName) {
                    return {
                        icon: <WrenchScrewdriverIcon className="w-4 h-4" />,
                        text: getToolDescription(toolName),
                        color: "text-green-500",
                        bgColor: "bg-green-100 dark:bg-green-900/30",
                    };
                }
                return {
                    icon: <WrenchScrewdriverIcon className="w-4 h-4" />,
                    text: "Executing...",
                    color: "text-green-500",
                    bgColor: "bg-green-100 dark:bg-green-900/30",
                };

            case "responding":
                return {
                    icon: <ChatBubbleLeftIcon className="w-4 h-4" />,
                    text: "Generating response...",
                    color: "text-[#9ACD32]",
                    bgColor: "bg-[#9ACD32]/10",
                };

            default:
                return {
                    icon: <SparklesIcon className="w-4 h-4" />,
                    text: "Processing...",
                    color: "text-[#9ACD32]",
                    bgColor: "bg-[#9ACD32]/10",
                };
        }
    };

    const { icon, text, color, bgColor } = getPhaseContent();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-start gap-3 py-4"
        >
            {/* Avatar */}
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#9ACD32] to-[#7BA428] flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-neutral-900" />
            </div>

            {/* Status indicator */}
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">MrMorris AI</span>
                </div>

                <motion.div
                    key={phase + toolName + subagentName}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor}`}
                >
                    <motion.div
                        animate={{ rotate: phase !== "responding" ? 360 : 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className={color}
                    >
                        {icon}
                    </motion.div>
                    <span className={`text-sm ${color}`}>{text}</span>
                </motion.div>

                {/* Typing dots for responding phase */}
                {phase === "responding" && (
                    <div className="flex items-center gap-1 mt-2">
                        <motion.div
                            className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.4, 0.8, 0.4],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: 0,
                            }}
                        />
                        <motion.div
                            className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.4, 0.8, 0.4],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: 0.2,
                            }}
                        />
                        <motion.div
                            className="w-2 h-2 bg-muted-foreground/40 rounded-full"
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.4, 0.8, 0.4],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: 0.4,
                            }}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
