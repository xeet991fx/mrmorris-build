"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { getInsights, generateInsights, Insight } from "@/lib/api/insights";
import { InsightCard } from "./InsightCard";
import { InsightToast } from "./InsightToast";

interface InsightsPanelProps {
    workspaceId: string;
    contextType: 'contact' | 'deal' | 'campaign' | 'email' | 'workflow' | 'pipeline';
    contextId?: string;
    className?: string;
    onAction?: (actionId: string, actionType: string) => void;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
    workspaceId,
    contextType,
    contextId,
    className,
    onAction,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [toastInsight, setToastInsight] = useState<Insight | null>(null);

    // Fetch insights on mount
    useEffect(() => {
        loadInsights();
    }, [workspaceId, contextType, contextId]);

    const loadInsights = async () => {
        try {
            setLoading(true);
            const response = await getInsights(workspaceId, contextType, contextId);
            if (response.success) {
                const fetchedInsights = response.data;
                setInsights(fetchedInsights);

                // Show toast for high-priority immediate insights
                const toastCandidate = fetchedInsights.find(
                    i => i.displayType === 'toast_notification' && i.priority === 'high'
                );
                if (toastCandidate) {
                    setToastInsight(toastCandidate);
                }
            }
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate new insights
    const triggerGeneration = async () => {
        try {
            const response = await generateInsights(workspaceId, contextType, contextId);
            if (response.success && response.data.length > 0) {
                await loadInsights(); // Refresh insights
            }
        } catch (error) {
            console.error('Error generating insights:', error);
        }
    };

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    const handleToastDismiss = () => {
        setToastInsight(null);
    };

    // Filter inline insights (not toast)
    const inlineInsights = insights.filter(
        i => i.displayType === 'inline_panel' || i.displayType === 'inline_alert'
    );

    if (loading) {
        return (
            <div className={className}>
                <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <div className="h-4 w-32 rounded bg-gray-300 dark:bg-gray-600" />
                    </div>
                    <div className="mt-3 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        );
    }

    if (inlineInsights.length === 0) {
        return null; // Don't show empty panel
    }

    return (
        <>
            <div className={className}>
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-purple-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            AI Insights
                        </h3>
                    </div>
                    <button
                        onClick={triggerGeneration}
                        className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
                    >
                        Refresh
                    </button>
                </div>

                <div className="space-y-3">
                    <AnimatePresence>
                        {inlineInsights.map(insight => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onAction={onAction}
                                onDismiss={() => handleDismiss(insight._id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Toast notification */}
            <AnimatePresence>
                {toastInsight && (
                    <InsightToast
                        insight={toastInsight}
                        onAction={onAction}
                        onDismiss={handleToastDismiss}
                        autoHideDuration={15000}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default InsightsPanel;
