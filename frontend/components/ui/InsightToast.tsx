"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Insight } from "@/lib/api/insights";

interface InsightToastProps {
    insight: Insight;
    onAction?: (actionId: string, actionType: string) => void;
    onDismiss: () => void;
    autoHideDuration?: number;
}

const typeIcons: Record<string, React.ElementType> = {
    risk_analysis: ExclamationTriangleIcon,
    engagement_analysis: SparklesIcon,
    email_categorization: InformationCircleIcon,
    default: SparklesIcon,
};

const typeColors: Record<string, string> = {
    risk_analysis: "from-red-500 to-orange-500",
    engagement_analysis: "from-purple-500 to-pink-500",
    email_categorization: "from-blue-500 to-cyan-500",
    default: "from-purple-500 to-blue-500",
};

export const InsightToast: React.FC<InsightToastProps> = ({
    insight,
    onAction,
    onDismiss,
    autoHideDuration = 10000,
}) => {
    const Icon = typeIcons[insight.insights.type] || typeIcons.default;
    const gradientColor = typeColors[insight.insights.type] || typeColors.default;

    useEffect(() => {
        if (autoHideDuration > 0) {
            const timer = setTimeout(onDismiss, autoHideDuration);
            return () => clearTimeout(timer);
        }
    }, [autoHideDuration, onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
                "fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-lg shadow-2xl",
                "bg-white dark:bg-gray-800",
                "border border-gray-200 dark:border-gray-700"
            )}
        >
            {/* Gradient accent bar */}
            <div className={cn("h-1 w-full bg-gradient-to-r", gradientColor)} />

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "rounded-full p-1.5",
                                "bg-gradient-to-r",
                                gradientColor
                            )}
                        >
                            <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {insight.insights.title}
                            </p>
                            <p className="text-xs text-gray-500">AI Insight</p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {insight.insights.description}
                </p>

                {/* Key data */}
                {insight.insights.data?.winProbability !== undefined && (
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Win Probability:</span>
                        <span
                            className={cn("text-sm font-bold", {
                                "text-green-600": insight.insights.data.winProbability >= 70,
                                "text-yellow-600":
                                    insight.insights.data.winProbability >= 40 &&
                                    insight.insights.data.winProbability < 70,
                                "text-red-600": insight.insights.data.winProbability < 40,
                            })}
                        >
                            {insight.insights.data.winProbability}%
                        </span>
                    </div>
                )}

                {insight.insights.data?.urgency === "immediate" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        <span>Requires immediate attention</span>
                    </div>
                )}

                {/* Actions */}
                {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={() => {
                                const action = insight.suggestedActions![0];
                                onAction?.(action.id, action.type);
                            }}
                            className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                        >
                            {insight.suggestedActions[0].label}
                        </button>
                        <button
                            onClick={onDismiss}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Later
                        </button>
                    </div>
                )}
            </div>

            {/* Progress bar for auto-dismiss */}
            {autoHideDuration > 0 && (
                <motion.div
                    className="h-0.5 bg-purple-500"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: autoHideDuration / 1000, ease: "linear" }}
                />
            )}
        </motion.div>
    );
};

export default InsightToast;
