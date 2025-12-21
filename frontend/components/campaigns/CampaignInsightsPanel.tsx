"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ChartBarIcon,
    LightBulbIcon,
    BeakerIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface CampaignInsightsPanelProps {
    workspaceId: string;
    campaignId: string;
    campaignStatus?: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
}

export const CampaignInsightsPanel: React.FC<CampaignInsightsPanelProps> = ({
    workspaceId,
    campaignId,
    campaignStatus = 'draft',
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'campaign', campaignId);
            if (response.success) {
                setInsights(response.data);
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
            const response = await generateInsights(workspaceId, 'campaign', campaignId);
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
    }, [workspaceId, campaignId]);

    const mainInsight = insights.find(i => i.insights.type === 'campaign_optimization');
    const optimizations = mainInsight?.insights.data?.optimizations || [];
    const abSuggestions = mainInsight?.insights.data?.abTestSuggestions || [];
    const predictions = mainInsight?.insights.data?.predictions;

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-foreground">Campaign Intelligence</span>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ArrowPathIcon className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Optimize"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-6">
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-purple-400" />
                </div>
            )}

            {/* Predictions */}
            {!isLoading && predictions && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-3 mb-4"
                >
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{predictions.expectedOpenRate}%</p>
                        <p className="text-xs text-muted-foreground">Est. Open Rate</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{predictions.expectedClickRate}%</p>
                        <p className="text-xs text-muted-foreground">Est. Click Rate</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold text-foreground">{predictions.expectedReplies}</p>
                        <p className="text-xs text-muted-foreground">Est. Replies</p>
                    </div>
                </motion.div>
            )}

            {/* Optimizations */}
            {!isLoading && optimizations.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <LightBulbIcon className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-medium text-muted-foreground">Optimizations</span>
                    </div>
                    <div className="space-y-2">
                        {optimizations.slice(0, 3).map((opt: any, idx: number) => (
                            <div key={idx} className="p-2 rounded bg-muted/30 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-foreground capitalize">{opt.area?.replace('_', ' ')}</span>
                                    {opt.expectedImpact && (
                                        <span className="text-green-500 text-[10px]">{opt.expectedImpact}</span>
                                    )}
                                </div>
                                {opt.suggested && (
                                    <p className="text-muted-foreground">Suggested: {opt.suggested}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* A/B Test Suggestions */}
            {!isLoading && abSuggestions.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <BeakerIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-muted-foreground">A/B Test Ideas</span>
                    </div>
                    {abSuggestions.slice(0, 2).map((ab: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-blue-500/10 text-xs mb-2">
                            <p className="text-foreground mb-1">Test: <span className="capitalize">{ab.testParameter}</span></p>
                            <div className="flex gap-2">
                                <span className="bg-muted px-1.5 py-0.5 rounded">A: {ab.variant_a?.substring(0, 30)}...</span>
                                <span className="bg-muted px-1.5 py-0.5 rounded">B: {ab.variant_b?.substring(0, 30)}...</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Insight Cards */}
            <AnimatePresence>
                {insights.slice(0, 2).map((insight) => (
                    <InsightCard
                        key={insight._id}
                        insight={insight}
                        workspaceId={workspaceId}
                        onDismiss={() => setInsights(prev => prev.filter(i => i._id !== insight._id))}
                        className="mt-3"
                    />
                ))}
            </AnimatePresence>

            {/* Empty State */}
            {!isLoading && insights.length === 0 && (
                <div className="text-center py-6">
                    <ChartBarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No campaign insights yet</p>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="mt-2 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        Get Optimization Tips
                    </button>
                </div>
            )}
        </div>
    );
};

export default CampaignInsightsPanel;
