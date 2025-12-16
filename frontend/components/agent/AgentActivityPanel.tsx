"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CpuChipIcon,
    ListBulletIcon,
    WrenchScrewdriverIcon,
    UserGroupIcon
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { AgentActivity, useAgentStore } from "@/store/useAgentStore";
import { getToolDescription, getSubagentDisplayName, TodoItem } from "@/lib/api/agent";

interface AgentActivityPanelProps {
    className?: string;
}

export default function AgentActivityPanel({ className = "" }: AgentActivityPanelProps) {
    const {
        activities,
        currentTodos,
        activeSubagent,
        currentPhase,
        showActivityPanel,
        toggleActivityPanel
    } = useAgentStore();

    const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

    const toggleActivity = (id: string) => {
        setExpandedActivities((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const hasContent = activities.length > 0 || currentTodos.length > 0 || activeSubagent || currentPhase !== "idle";

    if (!hasContent && !showActivityPanel) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`bg-muted/50 border border-border rounded-lg overflow-hidden ${className}`}
        >
            {/* Header */}
            <button
                onClick={toggleActivityPanel}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/80 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <CpuChipIcon className="w-4 h-4 text-[#9ACD32]" />
                    <span className="text-sm font-medium text-foreground">Agent Activity</span>
                    {currentPhase !== "idle" && (
                        <span className="text-xs text-muted-foreground animate-pulse">
                            • {currentPhase}
                        </span>
                    )}
                </div>
                {showActivityPanel ? (
                    <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            <AnimatePresence>
                {showActivityPanel && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 space-y-4"
                    >
                        {/* Active Subagent Badge */}
                        <AnimatePresence>
                            {activeSubagent && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-500/30"
                                >
                                    <UserGroupIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                                    <span className="text-sm text-purple-700 dark:text-purple-300">
                                        <strong>{getSubagentDisplayName(activeSubagent)}</strong> is working...
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Todo List */}
                        {currentTodos.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <ListBulletIcon className="w-4 h-4" />
                                    <span>Plan</span>
                                </div>
                                <div className="space-y-1">
                                    {currentTodos.map((todo, index) => (
                                        <TodoItemComponent key={todo.id || index} todo={todo} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Activity List */}
                        {activities.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <WrenchScrewdriverIcon className="w-4 h-4" />
                                    <span>Actions</span>
                                </div>
                                <div className="space-y-2">
                                    {activities.slice(-5).map((activity) => (
                                        <ActivityItem
                                            key={activity.id}
                                            activity={activity}
                                            isExpanded={expandedActivities.has(activity.id)}
                                            onToggle={() => toggleActivity(activity.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty state when idle */}
                        {!hasContent && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                Agent activity will appear here
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Todo Item Component
function TodoItemComponent({ todo }: { todo: TodoItem }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {todo.completed ? (
                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 flex-shrink-0" />
            )}
            <span className={todo.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                {todo.text}
            </span>
        </div>
    );
}

// Activity Item Component
function ActivityItem({
    activity,
    isExpanded,
    onToggle,
}: {
    activity: AgentActivity;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const getStatusIcon = () => {
        switch (activity.status) {
            case "active":
                return <ClockIcon className="w-4 h-4 text-blue-500 animate-spin" />;
            case "completed":
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case "failed":
                return <XCircleIcon className="w-4 h-4 text-red-500" />;
        }
    };

    const getActivityIcon = () => {
        switch (activity.type) {
            case "tool":
                return <WrenchScrewdriverIcon className="w-4 h-4 text-blue-500" />;
            case "subagent":
                return <UserGroupIcon className="w-4 h-4 text-purple-500" />;
            default:
                return <CpuChipIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getDuration = () => {
        if (!activity.endTime) return null;
        const duration = (activity.endTime - activity.startTime) / 1000;
        return `${duration.toFixed(1)}s`;
    };

    const displayName = activity.type === "subagent" && activity.name
        ? getSubagentDisplayName(activity.name)
        : activity.name || "Unknown";

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-background border border-border rounded-lg overflow-hidden"
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {getActivityIcon()}
                    <span className="text-sm font-medium text-foreground">{displayName}</span>
                    {activity.status === "active" && (
                        <span className="text-xs text-muted-foreground animate-pulse">
                            {getToolDescription(activity.name || "")}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {getDuration() && (
                        <span className="text-xs text-muted-foreground">{getDuration()}</span>
                    )}
                    {getStatusIcon()}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (activity.args || activity.result) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3 space-y-2"
                    >
                        {activity.args && (
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Input:</span>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                                    {JSON.stringify(activity.args, null, 2)}
                                </pre>
                            </div>
                        )}
                        {activity.result && (
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Output:</span>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                                    {typeof activity.result === "string"
                                        ? activity.result.substring(0, 500)
                                        : JSON.stringify(activity.result, null, 2).substring(0, 500)}
                                </pre>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
