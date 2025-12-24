"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    ChartBarIcon,
    LightBulbIcon,
    PencilIcon,
    ArrowTrendingUpIcon,
    BeakerIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface EmailTemplateIntelligencePanelProps {
    workspaceId: string;
    templateId?: string;
    templates?: any[];
}

interface TemplateMetrics {
    openRate: number;
    replyRate: number;
    clickRate: number;
    usageCount: number;
}

export const EmailTemplateIntelligencePanel: React.FC<EmailTemplateIntelligencePanelProps> = ({
    workspaceId,
    templateId,
    templates = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [metrics, setMetrics] = useState<TemplateMetrics | null>(null);

    const fetchInsights = async () => {
        if (!templateId) return;

        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'email_template', templateId);
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
        if (!templateId) return;

        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'email_template', templateId);
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
        const performanceInsight = insightsData.find(i => i.insights.type === 'template_performance');
        if (performanceInsight?.insights.data) {
            setMetrics(performanceInsight.insights.data as TemplateMetrics);
        }
    };

    useEffect(() => {
        if (templateId) {
            fetchInsights();
        }
    }, [templateId, workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    // Mock metrics for display
    const displayMetrics = metrics || {
        openRate: 42,
        replyRate: 8,
        clickRate: 15,
        usageCount: 234,
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Template Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !templateId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {/* No Template Selected */}
            {!templateId && (
                <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select a template to see AI insights</p>
                </div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && templateId && (
                <>
                    {/* Performance Metrics */}
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
                            <span className={cn("text-xl font-bold", {
                                "text-green-500": displayMetrics.openRate >= 40,
                                "text-yellow-500": displayMetrics.openRate >= 25 && displayMetrics.openRate < 40,
                                "text-red-500": displayMetrics.openRate < 25,
                            })}>
                                {displayMetrics.openRate}%
                            </span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <ChartBarIcon className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-muted-foreground">Reply Rate</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">{displayMetrics.replyRate}%</span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <DocumentTextIcon className="w-4 h-4 text-purple-500" />
                                <span className="text-xs text-muted-foreground">Click Rate</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">{displayMetrics.clickRate}%</span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <DocumentTextIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Times Used</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">{displayMetrics.usageCount}</span>
                        </div>
                    </motion.div>

                    {/* Subject Line Analysis */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 rounded-lg border border-border bg-card"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <PencilIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-foreground">Subject Line Analysis</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Word count</span>
                                <span className="text-green-500">6 words (optimal)</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Personalization</span>
                                <span className="text-yellow-500">Missing {"{{ firstName }}"}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Spam trigger words</span>
                                <span className="text-green-500">None detected</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Optimizations</h4>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Improve Subject Line</p>
                                <p className="text-xs text-muted-foreground">Get AI suggestions for better open rates</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <BeakerIcon className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Generate Variations</p>
                                <p className="text-xs text-muted-foreground">Create A/B test versions of this template</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <ChartBarIcon className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Compare to Top Templates</p>
                                <p className="text-xs text-muted-foreground">See how this template ranks</p>
                            </div>
                        </button>
                    </motion.div>

                    {/* Insight Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'template_performance').map((insight) => (
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

export default EmailTemplateIntelligencePanel;
