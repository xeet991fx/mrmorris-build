"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    BoltIcon,
    ChartBarIcon,
    LightBulbIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    BeakerIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface WorkflowIntelligencePanelProps {
    workspaceId: string;
    workflows?: any[];
}

interface WorkflowPerformance {
    workflowId: string;
    workflowName: string;
    status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
    metrics: {
        completionRate: number;
        avgTimeToComplete: number;
        enrollmentCount: number;
        conversionRate: number;
    };
    trend: 'improving' | 'stable' | 'declining';
    topIssue?: string;
}

interface OptimizationSuggestion {
    workflowId: string;
    workflowName: string;
    issue: string;
    impact: 'high' | 'medium' | 'low';
    suggestion: string;
    expectedImprovement: string;
    effort: 'easy' | 'moderate' | 'complex';
}

interface PatternDetection {
    pattern: string;
    frequency: number;
    actions: string[];
    timeSavings: number;
    complexity: 'simple' | 'moderate' | 'advanced';
    suggestedWorkflow: {
        name: string;
        description: string;
        estimatedROI: string;
    };
}

interface PerformancePrediction {
    workflowId: string;
    workflowName: string;
    prediction: string;
    confidence: number;
    expectedOutcomes: {
        metric: string;
        current: number;
        predicted: number;
        change: number;
    }[];
    recommendations: string[];
}

export const WorkflowIntelligencePanel: React.FC<WorkflowIntelligencePanelProps> = ({
    workspaceId,
    workflows = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [workflowPerformance, setWorkflowPerformance] = useState<WorkflowPerformance[]>([]);
    const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
    const [patterns, setPatterns] = useState<PatternDetection[]>([]);
    const [predictions, setPredictions] = useState<PerformancePrediction[]>([]);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'workflow');
            if (response.success) {
                setInsights(response.data);
                processWorkflowInsights(response.data);
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
            const response = await generateInsights(workspaceId, 'workflow');
            if (response.success) {
                setInsights(response.data);
                processWorkflowInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const processWorkflowInsights = (insightsData: Insight[]) => {
        const workflowInsight = insightsData.find(i => i.insights.type === 'workflow_intelligence');
        if (workflowInsight?.insights.data) {
            setWorkflowPerformance(workflowInsight.insights.data.performance || []);
            setOptimizations(workflowInsight.insights.data.optimizations || []);
            setPatterns(workflowInsight.insights.data.patterns || []);
            setPredictions(workflowInsight.insights.data.predictions || []);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId]);

    const getPerformanceColor = (status: string) => {
        switch (status) {
            case 'excellent': return 'text-green-500 bg-green-500/10';
            case 'good': return 'text-blue-500 bg-blue-500/10';
            case 'needs-improvement': return 'text-orange-500 bg-orange-500/10';
            case 'poor': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'high': return 'border-red-500 bg-red-500/10';
            case 'medium': return 'border-orange-500 bg-orange-500/10';
            case 'low': return 'border-blue-500 bg-blue-500/10';
            default: return 'border-gray-500 bg-gray-500/10';
        }
    };

    const getEffortBadge = (effort: string) => {
        switch (effort) {
            case 'easy': return 'bg-green-500/20 text-green-500';
            case 'moderate': return 'bg-yellow-500/20 text-yellow-500';
            case 'complex': return 'bg-red-500/20 text-red-500';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    const getComplexityIcon = (complexity: string) => {
        switch (complexity) {
            case 'simple': return '🟢';
            case 'moderate': return '🟡';
            case 'advanced': return '🔴';
            default: return '⚪';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Workflow Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Refresh"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Workflow Performance */}
                    {workflowPerformance.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <ChartBarIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-foreground">Workflow Performance</span>
                            </div>
                            <div className="space-y-3">
                                {workflowPerformance.slice(0, 5).map((perf, idx) => (
                                    <motion.div
                                        key={perf.workflowId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">{perf.workflowName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                                        getPerformanceColor(perf.status)
                                                    )}>
                                                        {perf.status.replace('-', ' ')}
                                                    </span>
                                                    {perf.trend === 'improving' && (
                                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                                            <ArrowTrendingUpIcon className="w-3 h-3" />
                                                            Improving
                                                        </span>
                                                    )}
                                                    {perf.trend === 'declining' && (
                                                        <span className="text-xs text-red-500 flex items-center gap-1">
                                                            <ArrowTrendingDownIcon className="w-3 h-3" />
                                                            Declining
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">
                                                    {perf.metrics.completionRate}%
                                                </p>
                                                <p className="text-xs text-muted-foreground">Complete</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">
                                                    {perf.metrics.avgTimeToComplete}h
                                                </p>
                                                <p className="text-xs text-muted-foreground">Avg Time</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">
                                                    {perf.metrics.enrollmentCount}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Enrolled</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">
                                                    {perf.metrics.conversionRate}%
                                                </p>
                                                <p className="text-xs text-muted-foreground">Convert</p>
                                            </div>
                                        </div>
                                        {perf.topIssue && (
                                            <div className="mt-2 flex items-center gap-2 p-2 rounded bg-orange-500/10">
                                                <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                <p className="text-xs text-orange-500">{perf.topIssue}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Optimization Suggestions */}
                    {optimizations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                                <span className="font-semibold text-foreground">Optimization Opportunities</span>
                            </div>
                            <div className="space-y-3">
                                {optimizations.map((opt, idx) => (
                                    <motion.div
                                        key={opt.workflowId + idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "p-3 rounded-lg border-l-4",
                                            getImpactColor(opt.impact)
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-foreground">{opt.workflowName}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                                        opt.impact === 'high' ? 'bg-red-500/20 text-red-500' :
                                                        opt.impact === 'medium' ? 'bg-orange-500/20 text-orange-500' :
                                                        'bg-blue-500/20 text-blue-500'
                                                    )}>
                                                        {opt.impact} impact
                                                    </span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium",
                                                        getEffortBadge(opt.effort)
                                                    )}>
                                                        {opt.effort}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    <strong>Issue:</strong> {opt.issue}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 p-2 rounded bg-muted/30 mb-2">
                                            <LightBulbIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-foreground">{opt.suggestion}</p>
                                        </div>
                                        <p className="text-xs text-green-500 font-medium">
                                            💡 Expected improvement: {opt.expectedImprovement}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Pattern Detection */}
                    {patterns.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <BoltIcon className="w-5 h-5 text-purple-500" />
                                <span className="font-semibold text-foreground">Detected Patterns</span>
                                <span className="text-xs text-muted-foreground">(Automation opportunities)</span>
                            </div>
                            <div className="space-y-3">
                                {patterns.map((pattern, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50 bg-gradient-to-r from-purple-500/5 to-transparent"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">{getComplexityIcon(pattern.complexity)}</span>
                                                    <span className="font-medium text-foreground">{pattern.pattern}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                                    <span>
                                                        <ArrowPathIcon className="w-3 h-3 inline mr-1" />
                                                        {pattern.frequency}x detected
                                                    </span>
                                                    <span className="text-green-500">
                                                        <ClockIcon className="w-3 h-3 inline mr-1" />
                                                        Save ~{pattern.timeSavings} min/month
                                                    </span>
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Actions involved:</p>
                                                    {pattern.actions.map((action, i) => (
                                                        <p key={i} className="text-xs text-foreground">• {action}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded bg-purple-500/10 border border-purple-500/20">
                                            <p className="text-sm font-medium text-foreground mb-1">
                                                💡 {pattern.suggestedWorkflow.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {pattern.suggestedWorkflow.description}
                                            </p>
                                            <p className="text-xs text-purple-500 font-medium">
                                                ROI: {pattern.suggestedWorkflow.estimatedROI}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Performance Predictions */}
                    {predictions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <BeakerIcon className="w-5 h-5 text-cyan-500" />
                                <span className="font-semibold text-foreground">Performance Predictions</span>
                            </div>
                            <div className="space-y-3">
                                {predictions.map((pred, idx) => (
                                    <motion.div
                                        key={pred.workflowId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-foreground">{pred.workflowName}</span>
                                            <span className="text-xs text-cyan-500">
                                                {pred.confidence}% confidence
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground mb-3">{pred.prediction}</p>

                                        <div className="space-y-2 mb-3">
                                            {pred.expectedOutcomes.map((outcome, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20">
                                                    <span className="text-xs text-muted-foreground">{outcome.metric}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            {outcome.current}
                                                        </span>
                                                        <span className="text-xs">→</span>
                                                        <span className="text-xs font-medium text-foreground">
                                                            {outcome.predicted}
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs font-medium",
                                                            outcome.change > 0 ? 'text-green-500' : 'text-red-500'
                                                        )}>
                                                            {outcome.change > 0 ? '+' : ''}{outcome.change}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
                                            {pred.recommendations.map((rec, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <CheckCircleIcon className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-xs text-foreground">{rec}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* AI Insights Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'workflow_intelligence' && i.insights.type !== 'automation_suggestion').map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => setInsights(prev => prev.filter(i => i._id !== insight._id))}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {insights.length === 0 && workflowPerformance.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <BoltIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">No workflow insights yet</p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Create and run workflows to see performance analytics and optimization suggestions
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Generate Workflow Intelligence
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WorkflowIntelligencePanel;
