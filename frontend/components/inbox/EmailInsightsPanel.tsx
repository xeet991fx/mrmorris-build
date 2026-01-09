"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Sparkles,
    RefreshCw,
    Mail,
    AlertTriangle,
    Bell,
    MessageSquare,
    Smile,
    Frown,
    Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";

interface EmailInsightsPanelProps {
    workspaceId: string;
    emailId: string;
}

const categoryColors: Record<string, string> = {
    inquiry: "bg-blue-500/10 text-blue-500",
    complaint: "bg-rose-500/10 text-rose-500",
    followup: "bg-amber-500/10 text-amber-500",
    opportunity: "bg-emerald-500/10 text-emerald-500",
    fyi: "bg-zinc-500/10 text-zinc-500",
    spam: "bg-rose-500/10 text-rose-500",
};

const urgencyColors: Record<string, string> = {
    immediate: "bg-rose-500 text-white",
    today: "bg-amber-500/10 text-amber-500",
    this_week: "bg-blue-500/10 text-blue-500",
    no_rush: "bg-zinc-500/10 text-zinc-500",
};

export const EmailInsightsPanel: React.FC<EmailInsightsPanelProps> = ({
    workspaceId,
    emailId,
}) => {
    const [insight, setInsight] = useState<Insight | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'email', emailId);
            if (response.success && response.data.length > 0) {
                setInsight(response.data[0]);
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
            const response = await generateInsights(workspaceId, 'email', emailId);
            if (response.success && response.data.length > 0) {
                setInsight(response.data[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId, emailId]);

    const data = insight?.insights.data;
    const category = data?.category;
    const urgency = data?.urgency;
    const sentiment = data?.sentiment;
    const actionItems = data?.actionItems || [];
    const suggestedResponse = data?.suggestedResponse;

    const getSentimentIcon = () => {
        switch (sentiment) {
            case "positive":
                return <Smile className="w-3.5 h-3.5 text-emerald-500" />;
            case "negative":
                return <Frown className="w-3.5 h-3.5 text-rose-500" />;
            default:
                return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
        }
    };

    return (
        <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Email Intelligence</span>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-6">
                    <RefreshCw className="w-4 h-4 animate-spin text-violet-500" />
                </div>
            )}

            {!isLoading && insight && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-1.5">
                        {category && (
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", categoryColors[category] || categoryColors.fyi)}>
                                {category}
                            </span>
                        )}
                        {urgency && (
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1", urgencyColors[urgency] || urgencyColors.no_rush)}>
                                {urgency === 'immediate' && <Bell className="w-3 h-3" />}
                                {urgency.replace('_', ' ')}
                            </span>
                        )}
                        {sentiment && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {getSentimentIcon()}
                                <span className="capitalize">{sentiment}</span>
                            </span>
                        )}
                    </div>

                    {/* Urgent Alert */}
                    {urgency === 'immediate' && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 text-xs">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">Requires immediate attention</span>
                        </div>
                    )}

                    {/* Action Items */}
                    {actionItems.length > 0 && (
                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Action Items</span>
                            <div className="space-y-2">
                                {actionItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                        <input type="checkbox" className="mt-0.5 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500" />
                                        <span className="text-zinc-700 dark:text-zinc-300 flex-1">{item.action}</span>
                                        {item.deadline && (
                                            <span className="text-zinc-400 whitespace-nowrap">by {item.deadline}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggested Response */}
                    {suggestedResponse && (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-3">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Suggested Reply</span>
                                <span className="ml-auto text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                                    {Math.round((suggestedResponse.confidence || 0.8) * 100)}% match
                                </span>
                            </div>
                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                                {suggestedResponse.template?.substring(0, 150)}...
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 px-3 py-2 text-xs font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors">
                                    Use Reply
                                </button>
                                <button className="px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    Edit
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && !insight && (
                <div className="text-center py-6">
                    <Mail className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 mb-3">No analysis yet</p>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-4 py-2 text-xs font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
                    >
                        Analyze Email
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmailInsightsPanel;
