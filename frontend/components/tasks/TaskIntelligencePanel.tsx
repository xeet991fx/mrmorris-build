"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    BoltIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    LightBulbIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface TaskIntelligencePanelProps {
    workspaceId: string;
    tasks: any[];
    onTaskAction?: (taskId: string, action: string) => void;
}

interface TaskPriority {
    taskId: string;
    score: number;
    reasons: string[];
    revenueImpact: number;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    effort: number; // 1-5
    blocksOthers: boolean;
}

export const TaskIntelligencePanel: React.FC<TaskIntelligencePanelProps> = ({
    workspaceId,
    tasks,
    onTaskAction,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [priorities, setPriorities] = useState<TaskPriority[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'workflow');
            if (response.success) {
                setInsights(response.data);
                processTaskInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'workflow');
            if (response.success) {
                setInsights(response.data);
                processTaskInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const processTaskInsights = (insightsData: Insight[]) => {
        const taskInsight = insightsData.find(i => i.insights.type === 'task_prioritization');
        if (taskInsight?.insights.data) {
            setPriorities(taskInsight.insights.data.priorities || []);
            setRecommendations(taskInsight.insights.data.recommendations || []);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId]);

    // Calculate quick stats
    const criticalTasks = priorities.filter(p => p.urgency === 'critical').length;
    const highRevenueTasks = priorities.filter(p => p.revenueImpact > 10000).length;
    const blockingTasks = priorities.filter(p => p.blocksOthers).length;

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'critical': return 'text-red-500 bg-red-500/10';
            case 'high': return 'text-orange-500 bg-orange-500/10';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Task Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Refresh"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                                <span className="text-xs text-muted-foreground">Critical</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{criticalTasks}</p>
                            <p className="text-xs text-muted-foreground">Need attention now</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-3 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-muted-foreground">High Value</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{highRevenueTasks}</p>
                            <p className="text-xs text-muted-foreground">Impact revenue</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-3 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <UserGroupIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Blocking</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">{blockingTasks}</p>
                            <p className="text-xs text-muted-foreground">Others waiting</p>
                        </motion.div>
                    </div>

                    {/* Smart Recommendations */}
                    {recommendations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                                <span className="font-semibold text-foreground">Smart Recommendations</span>
                            </div>
                            <div className="space-y-2">
                                {recommendations.slice(0, 3).map((rec: any, idx: number) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-start gap-3 p-3 rounded bg-muted/50"
                                    >
                                        <span className="text-purple-500 mt-0.5">
                                            {rec.type === 'focus' && '🎯'}
                                            {rec.type === 'delegate' && '👥'}
                                            {rec.type === 'schedule' && '📅'}
                                            {rec.type === 'batch' && '📦'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">{rec.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                                            {rec.timeSaving && (
                                                <p className="text-xs text-green-500 mt-1">
                                                    💰 Saves {rec.timeSaving}
                                                </p>
                                            )}
                                        </div>
                                        {rec.action && (
                                            <button
                                                onClick={() => onTaskAction?.(rec.taskId, rec.action)}
                                                className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700"
                                            >
                                                {rec.actionLabel || 'Apply'}
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Top Priority Tasks */}
                    {priorities.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <BoltIcon className="w-5 h-5 text-purple-500" />
                                <span className="font-semibold text-foreground">Do These First</span>
                            </div>
                            <div className="space-y-2">
                                {priorities.slice(0, 5).map((priority: TaskPriority, idx: number) => {
                                    const task = tasks.find(t => t._id === priority.taskId);
                                    if (!task) return null;

                                    return (
                                        <motion.div
                                            key={priority.taskId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-3 rounded border border-border/50 hover:border-purple-500/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg font-bold text-muted-foreground">
                                                            #{idx + 1}
                                                        </span>
                                                        <h4 className="font-medium text-foreground">{task.title}</h4>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-xs font-medium capitalize",
                                                            getUrgencyColor(priority.urgency)
                                                        )}>
                                                            {priority.urgency}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {priority.revenueImpact > 0 && (
                                                            <span className="flex items-center gap-1 text-xs text-green-500">
                                                                <CurrencyDollarIcon className="w-3 h-3" />
                                                                ${(priority.revenueImpact / 1000).toFixed(0)}K impact
                                                            </span>
                                                        )}
                                                        {priority.blocksOthers && (
                                                            <span className="flex items-center gap-1 text-xs text-blue-500">
                                                                <UserGroupIcon className="w-3 h-3" />
                                                                Blocking others
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <ClockIcon className="w-3 h-3" />
                                                            {priority.effort}h effort
                                                        </span>
                                                    </div>
                                                    {priority.reasons.length > 0 && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {priority.reasons[0]}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-purple-500">
                                                        {priority.score}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">priority</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* AI Insights Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'task_prioritization').map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => setInsights(prev => prev.filter(i => i._id !== insight._id))}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {insights.length === 0 && priorities.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">No task insights yet</p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Generate Task Intelligence
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TaskIntelligencePanel;
