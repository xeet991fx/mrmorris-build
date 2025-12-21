"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    BoltIcon,
    ClockIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";

interface AutomationSuggestionsCardProps {
    workspaceId: string;
}

export const AutomationSuggestionsCard: React.FC<AutomationSuggestionsCardProps> = ({
    workspaceId,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'workflow');
            if (response.success) {
                setInsights(response.data.filter(i => i.insights.type === 'automation_suggestion'));
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
                setInsights(prev => [...response.data, ...prev]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId]);

    const handleCreateWorkflow = (suggestion: Insight) => {
        // TODO: Navigate to workflow builder with pre-filled data
        console.log('Creating workflow from suggestion:', suggestion.insights.data?.suggestedWorkflow);
    };

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                        <BoltIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="font-semibold text-foreground">Automation Opportunities</span>
                        <p className="text-xs text-muted-foreground">Based on your recent actions</p>
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ArrowPathIcon className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Scan"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-purple-400" />
                </div>
            )}

            {/* Suggestions */}
            {!isLoading && insights.length > 0 && (
                <div className="space-y-3">
                    {insights.map((insight, idx) => (
                        <motion.div
                            key={insight._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-3 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-foreground">
                                        {insight.insights.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {insight.insights.description}
                                    </p>
                                </div>
                                <SparklesIcon className="w-4 h-4 text-purple-500 shrink-0" />
                            </div>

                            {/* Pattern Info */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <ArrowPathIcon className="w-3 h-3" />
                                    {insight.insights.data?.frequency || 0}x in 30 days
                                </span>
                                {insight.insights.data?.timeSavings && (
                                    <span className="flex items-center gap-1 text-green-600">
                                        <ClockIcon className="w-3 h-3" />
                                        Save ~{insight.insights.data.timeSavings} min/month
                                    </span>
                                )}
                            </div>

                            {/* Create Workflow Button */}
                            <button
                                onClick={() => handleCreateWorkflow(insight)}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Create Workflow
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && insights.length === 0 && (
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3">
                        <BoltIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">No automation opportunities detected</p>
                    <p className="text-xs text-muted-foreground mb-4">
                        We&apos;ll analyze your actions to find patterns that can be automated
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        {isGenerating ? "Scanning..." : "Scan for Patterns"}
                    </button>
                </div>
            )}

            {/* Info Footer */}
            {!isLoading && insights.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-[10px] text-muted-foreground text-center">
                        💡 Tip: The more you use the app, the smarter our suggestions become
                    </p>
                </div>
            )}
        </div>
    );
};

export default AutomationSuggestionsCard;
