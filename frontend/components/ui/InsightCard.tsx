"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Insight, markInsightActed, dismissInsight, provideFeedback } from "@/lib/api/insights";

interface InsightCardProps {
    insight: Insight;
    workspaceId: string;
    onAction?: (actionId: string, actionType: string) => void;
    onDismiss?: () => void;
    className?: string;
}

const priorityColors = {
    high: "border-l-red-500 bg-red-500/5",
    medium: "border-l-yellow-500 bg-yellow-500/5",
    low: "border-l-blue-500 bg-blue-500/5",
};

const priorityBadgeColors = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export const InsightCard: React.FC<InsightCardProps> = ({
    insight,
    workspaceId,
    onAction,
    onDismiss,
    className,
}) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [feedbackGiven, setFeedbackGiven] = React.useState<boolean | null>(null);

    const handleAction = async (actionId: string, actionType: string) => {
        setIsLoading(true);
        try {
            await markInsightActed(workspaceId, insight._id, actionType);
            onAction?.(actionId, actionType);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = async () => {
        setIsLoading(true);
        try {
            await dismissInsight(workspaceId, insight._id);
            onDismiss?.();
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeedback = async (helpful: boolean) => {
        setFeedbackGiven(helpful);
        await provideFeedback(workspaceId, insight._id, helpful);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
                "relative rounded-lg border-l-4 p-4 shadow-sm",
                "bg-white dark:bg-gray-800",
                priorityColors[insight.priority],
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {insight.insights.title}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span
                        className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            priorityBadgeColors[insight.priority]
                        )}
                    >
                        {insight.priority}
                    </span>
                    <button
                        onClick={handleDismiss}
                        disabled={isLoading}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Description */}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {insight.insights.description}
            </p>

            {/* Data (if engagement level, risk, etc) */}
            {insight.insights.data?.engagementLevel && (
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Engagement:</span>
                    <span
                        className={cn("rounded-full px-2 py-0.5 text-xs font-medium", {
                            "bg-green-100 text-green-700": insight.insights.data.engagementLevel === "hot",
                            "bg-yellow-100 text-yellow-700": insight.insights.data.engagementLevel === "warm",
                            "bg-gray-100 text-gray-700": insight.insights.data.engagementLevel === "cold",
                            "bg-red-100 text-red-700": insight.insights.data.engagementLevel === "ghosting",
                        })}
                    >
                        {insight.insights.data.engagementLevel}
                    </span>
                </div>
            )}

            {insight.insights.data?.winProbability !== undefined && (
                <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Win Probability</span>
                        <span className="font-medium">{insight.insights.data.winProbability}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                            className={cn("h-full transition-all", {
                                "bg-green-500": insight.insights.data.winProbability >= 70,
                                "bg-yellow-500":
                                    insight.insights.data.winProbability >= 40 &&
                                    insight.insights.data.winProbability < 70,
                                "bg-red-500": insight.insights.data.winProbability < 40,
                            })}
                            style={{ width: `${insight.insights.data.winProbability}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Risk Flags */}
            {insight.insights.data?.riskFlags && (insight.insights.data.riskFlags as any[]).length > 0 && (
                <div className="mt-3">
                    <span className="text-xs text-gray-500">Risk Flags:</span>
                    <ul className="mt-1 space-y-1">
                        {(insight.insights.data.riskFlags as any[]).slice(0, 3).map((flag: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-1 text-xs text-red-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                {typeof flag === "string" ? flag : flag?.factor || String(flag)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions */}
            {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {insight.suggestedActions.slice(0, 2).map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleAction(action.id, action.type)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
                        >
                            {action.label}
                            <ChevronRightIcon className="h-3 w-3" />
                        </button>
                    ))}
                </div>
            )}

            {/* Feedback */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <span className="text-xs text-gray-400">Was this helpful?</span>
                <div className="flex gap-1">
                    <button
                        onClick={() => handleFeedback(true)}
                        disabled={feedbackGiven !== null}
                        className={cn(
                            "rounded p-1 transition-colors",
                            feedbackGiven === true
                                ? "bg-green-100 text-green-600"
                                : "text-gray-400 hover:bg-gray-100 hover:text-green-600"
                        )}
                    >
                        <HandThumbUpIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleFeedback(false)}
                        disabled={feedbackGiven !== null}
                        className={cn(
                            "rounded p-1 transition-colors",
                            feedbackGiven === false
                                ? "bg-red-100 text-red-600"
                                : "text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        )}
                    >
                        <HandThumbDownIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Confidence indicator */}
            <div className="absolute right-2 top-2 opacity-50">
                <span className="text-[10px] text-gray-400">
                    {Math.round(insight.confidence * 100)}% conf
                </span>
            </div>
        </motion.div>
    );
};

export default InsightCard;
