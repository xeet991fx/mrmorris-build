"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    FaceSmileIcon,
    MinusIcon,
    FaceFrownIcon,
    LightBulbIcon,
    ClockIcon,
    PhoneIcon,
    EnvelopeIcon,
    CalendarIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Contact } from "@/lib/api/contact";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface ContactInsightsTabProps {
    contact: Contact;
}

export default function ContactInsightsTab({ contact }: ContactInsightsTabProps) {
    const params = useParams();
    const workspaceId = params?.id as string;

    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Static insights from contact model
    const staticInsights = contact.aiInsights;

    // Fetch live insights
    const fetchInsights = async () => {
        if (!workspaceId || !contact._id) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await getInsights(workspaceId, 'contact', contact._id);
            if (response.success) {
                setInsights(response.data);
            }
        } catch (err: any) {
            console.error('Error fetching insights:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate new insights
    const handleGenerateInsights = async () => {
        if (!workspaceId || !contact._id) return;

        setIsGenerating(true);
        setError(null);
        try {
            const response = await generateInsights(workspaceId, 'contact', contact._id);
            if (response.success) {
                setInsights(prev => [...response.data, ...prev]);
            }
        } catch (err: any) {
            console.error('Error generating insights:', err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId, contact._id]);

    const handleInsightDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    const getSentimentIcon = (sentiment: string | undefined) => {
        switch (sentiment) {
            case "positive":
                return <FaceSmileIcon className="w-5 h-5 text-green-400" />;
            case "negative":
                return <FaceFrownIcon className="w-5 h-5 text-red-400" />;
            default:
                return <MinusIcon className="w-5 h-5 text-yellow-400" />;
        }
    };

    const getSentimentColor = (sentiment: string | undefined) => {
        switch (sentiment) {
            case "positive":
                return "text-green-400 bg-green-500/10 border-green-500/20";
            case "negative":
                return "text-red-400 bg-red-500/10 border-red-500/20";
            default:
                return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
        }
    };

    const getChannelIcon = (channel: string | undefined) => {
        switch (channel) {
            case "email":
                return <EnvelopeIcon className="w-4 h-4" />;
            case "phone":
                return <PhoneIcon className="w-4 h-4" />;
            case "meeting":
                return <CalendarIcon className="w-4 h-4" />;
            default:
                return <EnvelopeIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-foreground">AI Insights</h3>
                </div>
                <button
                    onClick={handleGenerateInsights}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Refresh"}
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {/* Live AI Insights */}
            {!isLoading && insights.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Live Insights</h4>
                    <AnimatePresence>
                        {insights.map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => handleInsightDismiss(insight._id)}
                                className="mb-3"
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Static Insights from Contact Model */}
            {(!isLoading && (staticInsights || insights.length === 0)) && (
                <div className="space-y-4">
                    {/* Sentiment */}
                    {staticInsights?.sentiment && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Sentiment</span>
                                <span
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border",
                                        getSentimentColor(staticInsights.sentiment)
                                    )}
                                >
                                    {getSentimentIcon(staticInsights.sentiment)}
                                    <span className="capitalize">{staticInsights.sentiment || "Neutral"}</span>
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* Engagement Score */}
                    {staticInsights?.engagementScore !== undefined && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-4 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Engagement Score
                                </span>
                                <span className="text-lg font-bold text-foreground">
                                    {staticInsights.engagementScore}%
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${staticInsights.engagementScore}%` }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className={cn(
                                        "h-full rounded-full",
                                        staticInsights.engagementScore >= 70
                                            ? "bg-green-500"
                                            : staticInsights.engagementScore >= 40
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                    )}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Recommended Actions from static insights */}
                    {staticInsights?.recommendedActions && staticInsights.recommendedActions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-4 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <LightBulbIcon className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium text-foreground">
                                    Recommended Actions
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {staticInsights.recommendedActions.map((action, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + index * 0.1 }}
                                        className="flex items-start gap-2 text-sm text-foreground"
                                    >
                                        <span className="text-black mt-0.5">→</span>
                                        <span>{action}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    )}

                    {/* Last Analyzed */}
                    {staticInsights?.lastAnalyzedAt && (
                        <p className="text-xs text-muted-foreground text-center">
                            Last analyzed: {format(new Date(staticInsights.lastAnalyzedAt), "MMM d, yyyy h:mm a")}
                        </p>
                    )}

                    {/* Empty state */}
                    {!staticInsights && insights.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                                <SparklesIcon className="w-8 h-8 text-purple-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">No AI insights available yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Click &quot;Refresh&quot; to generate insights based on contact data
                            </p>
                            <button
                                onClick={handleGenerateInsights}
                                disabled={isGenerating}
                                className="mt-4 px-4 py-2 text-sm font-medium text-background bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isGenerating ? "Generating..." : "Generate Insights"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
