"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ChartBarIcon,
    LightBulbIcon,
    ClockIcon,
    EnvelopeIcon,
    ArrowTrendingUpIcon,
    BeakerIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface SequenceIntelligencePanelProps {
    workspaceId: string;
    sequenceId?: string;
    sequences?: any[];
}

interface SequenceMetrics {
    openRate: number;
    replyRate: number;
    dropOffStep: number;
    bestPerformingSubject: string;
    averageTimeToReply: string;
}

export const SequenceIntelligencePanel: React.FC<SequenceIntelligencePanelProps> = ({
    workspaceId,
    sequenceId,
    sequences = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [metrics, setMetrics] = useState<SequenceMetrics | null>(null);

    const fetchInsights = async () => {
        if (!sequenceId) return;

        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'sequence', sequenceId);
            if (response.success) {
                setInsights(response.data);
                processInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!sequenceId) return;

        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'sequence', sequenceId);
            if (response.success) {
                setInsights(prev => [...response.data, ...prev]);
                processInsights([...response.data, ...insights]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const processInsights = (insightsData: Insight[]) => {
        const performanceInsight = insightsData.find(i => i.insights.type === 'sequence_performance');
        if (performanceInsight?.insights.data) {
            setMetrics(performanceInsight.insights.data as SequenceMetrics);
        }
    };

    useEffect(() => {
        if (sequenceId) {
            fetchInsights();
        }
    }, [sequenceId, workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Sequence Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !sequenceId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {/* No Sequence Selected */}
            {!sequenceId && (
                <div className="text-center py-8">
                    <EnvelopeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select a sequence to see AI insights</p>
                </div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && sequenceId && (
                <>
                    {/* Performance Metrics */}
                    {metrics && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-2 gap-3"
                        >
                            <div className="p-3 rounded-lg border border-border bg-card">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                                    <span className="text-xs text-muted-foreground">Open Rate</span>
                                </div>
                                <span className="text-xl font-bold text-foreground">{metrics.openRate}%</span>
                            </div>
                            <div className="p-3 rounded-lg border border-border bg-card">
                                <div className="flex items-center gap-2 mb-1">
                                    <EnvelopeIcon className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs text-muted-foreground">Reply Rate</span>
                                </div>
                                <span className="text-xl font-bold text-foreground">{metrics.replyRate}%</span>
                            </div>
                            <div className="p-3 rounded-lg border border-border bg-card">
                                <div className="flex items-center gap-2 mb-1">
                                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs text-muted-foreground">Drop-off Step</span>
                                </div>
                                <span className="text-xl font-bold text-foreground">Step {metrics.dropOffStep}</span>
                            </div>
                            <div className="p-3 rounded-lg border border-border bg-card">
                                <div className="flex items-center gap-2 mb-1">
                                    <ClockIcon className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-muted-foreground">Avg Reply Time</span>
                                </div>
                                <span className="text-xl font-bold text-foreground">{metrics.averageTimeToReply}</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Quick Optimizations</h4>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Optimize Send Times</p>
                                <p className="text-xs text-muted-foreground">AI will analyze best times for your audience</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <BeakerIcon className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">A/B Test Suggestions</p>
                                <p className="text-xs text-muted-foreground">Get subject line and content variations</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <ChartBarIcon className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Benchmark Comparison</p>
                                <p className="text-xs text-muted-foreground">Compare with industry averages</p>
                            </div>
                        </button>
                    </motion.div>

                    {/* Insight Cards */}
                    <AnimatePresence>
                        {insights.map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => handleDismiss(insight._id)}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {insights.length === 0 && !metrics && (
                        <div className="text-center py-8">
                            <ChartBarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">No sequence insights yet</p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                Analyze Sequence
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SequenceIntelligencePanel;
