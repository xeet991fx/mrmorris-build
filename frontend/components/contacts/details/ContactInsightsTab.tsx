"use client";

import { motion } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    FaceSmileIcon,
    MinusIcon,
    FaceFrownIcon,
    LightBulbIcon,
} from "@heroicons/react/24/outline";
import { Contact } from "@/lib/api/contact";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ContactInsightsTabProps {
    contact: Contact;
}

export default function ContactInsightsTab({ contact }: ContactInsightsTabProps) {
    const insights = contact.aiInsights;

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

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-foreground">AI Insights</h3>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                    <ArrowPathIcon className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {!insights ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                        <SparklesIcon className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">No AI insights available yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Insights will be generated based on interactions with this contact
                    </p>
                    <button className="mt-4 px-4 py-2 text-sm font-medium text-background bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors">
                        Generate Insights
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Sentiment */}
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
                                    getSentimentColor(insights.sentiment)
                                )}
                            >
                                {getSentimentIcon(insights.sentiment)}
                                <span className="capitalize">{insights.sentiment || "Neutral"}</span>
                            </span>
                        </div>
                    </motion.div>

                    {/* Engagement Score */}
                    {insights.engagementScore !== undefined && (
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
                                    {insights.engagementScore}%
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${insights.engagementScore}%` }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className={cn(
                                        "h-full rounded-full",
                                        insights.engagementScore >= 70
                                            ? "bg-green-500"
                                            : insights.engagementScore >= 40
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                    )}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Recommended Actions */}
                    {insights.recommendedActions && insights.recommendedActions.length > 0 && (
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
                                {insights.recommendedActions.map((action, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + index * 0.1 }}
                                        className="flex items-start gap-2 text-sm text-foreground"
                                    >
                                        <span className="text-[#9ACD32] mt-0.5">→</span>
                                        <span>{action}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    )}

                    {/* Last Analyzed */}
                    {insights.lastAnalyzedAt && (
                        <p className="text-xs text-muted-foreground text-center">
                            Last analyzed: {format(new Date(insights.lastAnalyzedAt), "MMM d, yyyy h:mm a")}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
