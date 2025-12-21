"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ChartBarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface DealInsightsPanelProps {
    workspaceId: string;
    dealId: string;
    dealName?: string;
}

export const DealInsightsPanel: React.FC<DealInsightsPanelProps> = ({
    workspaceId,
    dealId,
    dealName,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getInsights(workspaceId, 'deal', dealId);
            if (response.success) {
                setInsights(response.data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInsights = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await generateInsights(workspaceId, 'deal', dealId);
            if (response.success) {
                setInsights(prev => [...response.data, ...prev]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId, dealId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    // Get the main deal insight for summary display
    const mainInsight = insights.find(i => i.insights.type === 'risk_analysis');
    const winProbability = mainInsight?.insights.data?.winProbability;
    const riskLevel = mainInsight?.insights.data?.riskLevel;

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-foreground">Deal Intelligence</span>
                </div>
                <button
                    onClick={handleGenerateInsights}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowPathIcon className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-2 rounded bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-6">
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-purple-400" />
                </div>
            )}

            {/* Win Probability Summary */}
            {!isLoading && winProbability !== undefined && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                >
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Win Probability</span>
                        <div className="flex items-center gap-2">
                            <span className={cn("font-bold", {
                                "text-green-500": winProbability >= 70,
                                "text-yellow-500": winProbability >= 40 && winProbability < 70,
                                "text-red-500": winProbability < 40,
                            })}>
                                {winProbability}%
                            </span>
                            {riskLevel && (
                                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", {
                                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400": riskLevel === "low",
                                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400": riskLevel === "medium",
                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400": riskLevel === "high" || riskLevel === "critical",
                                })}>
                                    {riskLevel} risk
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${winProbability}%` }}
                            transition={{ duration: 0.5 }}
                            className={cn("h-full rounded-full", {
                                "bg-green-500": winProbability >= 70,
                                "bg-yellow-500": winProbability >= 40 && winProbability < 70,
                                "bg-red-500": winProbability < 40,
                            })}
                        />
                    </div>
                </motion.div>
            )}

            {/* Risk Factors */}
            {!isLoading && mainInsight?.insights.data?.riskFactors && (mainInsight.insights.data.riskFactors as any[]).length > 0 && (
                <div className="mb-4">
                    <span className="text-xs text-muted-foreground mb-2 block">Risk Factors</span>
                    <div className="space-y-1.5">
                        {(mainInsight.insights.data.riskFactors as any[]).slice(0, 3).map((factor: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                                <ExclamationTriangleIcon className={cn("w-3.5 h-3.5 mt-0.5", {
                                    "text-red-500": factor.impact === "high",
                                    "text-yellow-500": factor.impact === "medium",
                                    "text-blue-500": factor.impact === "low",
                                })} />
                                <div>
                                    <span className="text-foreground">{typeof factor === 'string' ? factor : factor.factor}</span>
                                    {factor.recommendation && (
                                        <p className="text-muted-foreground mt-0.5">{factor.recommendation}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Insight Cards */}
            {!isLoading && insights.length > 0 && (
                <div className="space-y-3">
                    <AnimatePresence>
                        {insights.slice(0, 2).map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => handleDismiss(insight._id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && insights.length === 0 && (
                <div className="text-center py-6">
                    <ChartBarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No deal insights yet</p>
                    <button
                        onClick={handleGenerateInsights}
                        disabled={isGenerating}
                        className="mt-2 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                        Analyze Deal
                    </button>
                </div>
            )}
        </div>
    );
};

export default DealInsightsPanel;
