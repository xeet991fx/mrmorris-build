"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ChartBarIcon,
    EnvelopeIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface EmailAnalyticsIntelligencePanelProps {
    workspaceId: string;
}

interface EmailMetrics {
    deliverabilityRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    spamRate: number;
    bestSendTime: string;
    avgTimeToOpen: string;
}

export const EmailAnalyticsIntelligencePanel: React.FC<EmailAnalyticsIntelligencePanelProps> = ({
    workspaceId,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [metrics, setMetrics] = useState<EmailMetrics | null>(null);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'email_analytics', 'workspace');
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
        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'email_analytics', 'workspace');
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
        const analyticsInsight = insightsData.find(i => i.insights.type === 'email_performance');
        if (analyticsInsight?.insights.data) {
            setMetrics(analyticsInsight.insights.data as EmailMetrics);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    // Mock data for display
    const displayMetrics: EmailMetrics = metrics || {
        deliverabilityRate: 94,
        openRate: 38,
        clickRate: 12,
        bounceRate: 2.1,
        spamRate: 0.3,
        bestSendTime: "Tue 10am",
        avgTimeToOpen: "4.2 hrs",
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Email Analytics Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Key Metrics Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-muted-foreground">Deliverability</span>
                            </div>
                            <span className={cn("text-xl font-bold", {
                                "text-green-500": displayMetrics.deliverabilityRate >= 90,
                                "text-yellow-500": displayMetrics.deliverabilityRate >= 80 && displayMetrics.deliverabilityRate < 90,
                                "text-red-500": displayMetrics.deliverabilityRate < 80,
                            })}>
                                {displayMetrics.deliverabilityRate}%
                            </span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <EnvelopeIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Open Rate</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-foreground">{displayMetrics.openRate}%</span>
                                <span className="text-xs text-green-500 flex items-center">
                                    <ArrowTrendingUpIcon className="w-3 h-3" /> +3%
                                </span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <ChartBarIcon className="w-4 h-4 text-purple-500" />
                                <span className="text-xs text-muted-foreground">Click Rate</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">{displayMetrics.clickRate}%</span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">Bounce Rate</span>
                            </div>
                            <span className={cn("text-xl font-bold", {
                                "text-green-500": displayMetrics.bounceRate < 2,
                                "text-yellow-500": displayMetrics.bounceRate >= 2 && displayMetrics.bounceRate < 5,
                                "text-red-500": displayMetrics.bounceRate >= 5,
                            })}>
                                {displayMetrics.bounceRate}%
                            </span>
                        </div>
                    </motion.div>

                    {/* Best Practices */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 rounded-lg border border-border bg-card"
                    >
                        <h4 className="text-sm font-medium text-foreground mb-3">Optimal Send Times</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <ClockIcon className="w-5 h-5 text-blue-500 mb-1" />
                                <p className="text-sm font-bold text-foreground">{displayMetrics.bestSendTime}</p>
                                <p className="text-xs text-muted-foreground">Best send time</p>
                            </div>
                            <div>
                                <EnvelopeIcon className="w-5 h-5 text-green-500 mb-1" />
                                <p className="text-sm font-bold text-foreground">{displayMetrics.avgTimeToOpen}</p>
                                <p className="text-xs text-muted-foreground">Avg time to open</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Anomalies & Alerts */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Anomalies Detected</h4>
                        <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                            <div className="flex items-start gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Bounce rate increased 15%</p>
                                    <p className="text-xs text-muted-foreground">Tech industry segment - check list hygiene</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                            <div className="flex items-start gap-2">
                                <ArrowTrendingUpIcon className="w-5 h-5 text-green-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Reply rate up 23%</p>
                                    <p className="text-xs text-muted-foreground">After subject line A/B test changes</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Benchmark Comparison */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-4 rounded-lg border border-border bg-card"
                    >
                        <h4 className="text-sm font-medium text-foreground mb-3">Industry Benchmark</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Your open rate</span>
                                <span className="text-green-500 font-medium">{displayMetrics.openRate}% (+8% vs avg)</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Industry average</span>
                                <span className="text-foreground">30%</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Insight Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'email_performance').map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => handleDismiss(insight._id)}
                            />
                        ))}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
};

export default EmailAnalyticsIntelligencePanel;
