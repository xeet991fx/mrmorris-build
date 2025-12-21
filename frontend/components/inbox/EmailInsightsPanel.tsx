"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon,
    BellAlertIcon,
    ChatBubbleLeftRightIcon,
    FaceSmileIcon,
    FaceFrownIcon,
    MinusIcon,
} from "@heroicons/react/24/outline";
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
    inquiry: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    complaint: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    followup: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    opportunity: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    fyi: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    spam: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const urgencyColors: Record<string, string> = {
    immediate: "bg-red-500 text-white",
    today: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    this_week: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    no_rush: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
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
                return <FaceSmileIcon className="w-4 h-4 text-green-500" />;
            case "negative":
                return <FaceFrownIcon className="w-4 h-4 text-red-500" />;
            default:
                return <MinusIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="rounded-lg border border-border bg-card p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-foreground">Email Intelligence</span>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ArrowPathIcon className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-4">
                    <ArrowPathIcon className="w-4 h-4 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && insight && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                >
                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-1.5">
                        {category && (
                            <span className={cn("px-2 py-0.5 rounded text-xs font-medium capitalize", categoryColors[category] || categoryColors.fyi)}>
                                {category}
                            </span>
                        )}
                        {urgency && (
                            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", urgencyColors[urgency] || urgencyColors.no_rush)}>
                                {urgency === 'immediate' && <BellAlertIcon className="w-3 h-3 inline mr-1" />}
                                {urgency.replace('_', ' ')}
                            </span>
                        )}
                        {sentiment && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted">
                                {getSentimentIcon()}
                                <span className="capitalize">{sentiment}</span>
                            </span>
                        )}
                    </div>

                    {/* Urgent Alert */}
                    {urgency === 'immediate' && (
                        <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 text-red-500 text-xs">
                            <ExclamationTriangleIcon className="w-4 h-4" />
                            <span>Requires immediate attention</span>
                        </div>
                    )}

                    {/* Action Items */}
                    {actionItems.length > 0 && (
                        <div>
                            <span className="text-xs text-muted-foreground mb-1 block">Action Items</span>
                            <div className="space-y-1">
                                {actionItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                        <input type="checkbox" className="mt-0.5 rounded" />
                                        <span className="text-foreground">{item.action}</span>
                                        {item.deadline && (
                                            <span className="text-muted-foreground ml-auto">by {item.deadline}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggested Response */}
                    {suggestedResponse && (
                        <div className="border-t border-border pt-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-medium text-muted-foreground">Suggested Reply</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">
                                    {Math.round((suggestedResponse.confidence || 0.8) * 100)}% match
                                </span>
                            </div>
                            <div className="p-2 rounded bg-muted/50 text-xs text-foreground mb-2">
                                {suggestedResponse.template?.substring(0, 150)}...
                            </div>
                            <div className="flex gap-2">
                                <button className="flex-1 px-2 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700">
                                    Use Reply
                                </button>
                                <button className="px-2 py-1.5 text-xs font-medium border border-border rounded hover:bg-muted">
                                    Edit
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && !insight && (
                <div className="text-center py-4">
                    <EnvelopeIcon className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">No analysis yet</p>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="mt-2 px-2 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        Analyze Email
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmailInsightsPanel;
