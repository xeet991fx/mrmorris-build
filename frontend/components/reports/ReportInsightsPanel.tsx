"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    LightBulbIcon,
    BoltIcon,
    TrophyIcon,
    FlagIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface ReportInsightsPanelProps {
    workspaceId: string;
    reportType?: string;
    dateRange?: { start: string; end: string };
}

interface TrendData {
    metric: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
    status: 'good' | 'warning' | 'critical';
}

interface Anomaly {
    metric: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    suggestedAction: string;
}

interface Forecast {
    metric: string;
    predicted: number;
    confidence: number;
    range: { min: number; max: number };
    trend: 'up' | 'down' | 'stable';
}

export const ReportInsightsPanel: React.FC<ReportInsightsPanelProps> = ({
    workspaceId,
    reportType = 'overview',
    dateRange,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'pipeline');
            if (response.success) {
                setInsights(response.data);
                processReportInsights(response.data);
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
            const response = await generateInsights(workspaceId, 'pipeline');
            if (response.success) {
                setInsights(response.data);
                processReportInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const processReportInsights = (insightsData: Insight[]) => {
        const reportInsight = insightsData.find(i => i.insights.type === 'analytics_intelligence');
        if (reportInsight?.insights.data) {
            setTrends(reportInsight.insights.data.trends || []);
            setAnomalies(reportInsight.insights.data.anomalies || []);
            setForecasts(reportInsight.insights.data.forecasts || []);
            setRecommendations(reportInsight.insights.data.recommendations || []);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId, reportType, dateRange]);

    const getTrendIcon = (trend: string, status: string) => {
        if (trend === 'up' && status === 'good') return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />;
        if (trend === 'up' && status === 'warning') return <ArrowTrendingUpIcon className="w-5 h-5 text-orange-500" />;
        if (trend === 'down' && status === 'critical') return <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />;
        if (trend === 'down' && status === 'good') return <ArrowTrendingDownIcon className="w-5 h-5 text-green-500" />;
        return <span className="w-5 h-5 text-gray-500">→</span>;
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'border-red-500 bg-red-500/10';
            case 'medium': return 'border-orange-500 bg-orange-500/10';
            default: return 'border-yellow-500 bg-yellow-500/10';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Analytics Intelligence</h3>
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
                    {/* Key Trends */}
                    {trends.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <ChartBarIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-foreground">Key Trends</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {trends.slice(0, 4).map((trend, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-muted-foreground">{trend.metric}</span>
                                            {getTrendIcon(trend.trend, trend.status)}
                                        </div>
                                        <p className="text-2xl font-bold text-foreground">{trend.current.toLocaleString()}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-xs font-medium",
                                                trend.status === 'good' ? 'text-green-500' :
                                                trend.status === 'warning' ? 'text-orange-500' :
                                                'text-red-500'
                                            )}>
                                                {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                vs previous period
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Anomalies */}
                    {anomalies.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                                <span className="font-semibold text-foreground">Anomalies Detected</span>
                            </div>
                            <div className="space-y-3">
                                {anomalies.map((anomaly, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "p-3 rounded-lg border-l-4",
                                            getSeverityColor(anomaly.severity)
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-foreground">{anomaly.metric}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                                        anomaly.severity === 'high' ? 'bg-red-500/20 text-red-500' :
                                                        anomaly.severity === 'medium' ? 'bg-orange-500/20 text-orange-500' :
                                                        'bg-yellow-500/20 text-yellow-500'
                                                    )}>
                                                        {anomaly.severity}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground mb-2">{anomaly.description}</p>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    <strong>Impact:</strong> {anomaly.impact}
                                                </p>
                                                <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                                                    <LightBulbIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                                    <p className="text-xs text-foreground">{anomaly.suggestedAction}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Forecasts */}
                    {forecasts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <BoltIcon className="w-5 h-5 text-purple-500" />
                                <span className="font-semibold text-foreground">Forecasts</span>
                            </div>
                            <div className="space-y-3">
                                {forecasts.map((forecast, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-foreground">{forecast.metric}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {forecast.confidence}% confidence
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <p className="text-2xl font-bold text-foreground">
                                                {forecast.predicted.toLocaleString()}
                                            </p>
                                            {forecast.trend === 'up' && (
                                                <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                                            )}
                                            {forecast.trend === 'down' && (
                                                <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                style={{ width: `${forecast.confidence}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Range: {forecast.range.min.toLocaleString()} - {forecast.range.max.toLocaleString()}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Smart Recommendations */}
                    {recommendations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <TrophyIcon className="w-5 h-5 text-yellow-500" />
                                <span className="font-semibold text-foreground">Strategic Recommendations</span>
                            </div>
                            <div className="space-y-2">
                                {recommendations.map((rec, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-start gap-3 p-3 rounded bg-muted/30"
                                    >
                                        <span className="text-2xl flex-shrink-0">
                                            {rec.type === 'focus' && '🎯'}
                                            {rec.type === 'optimize' && '⚡'}
                                            {rec.type === 'investigate' && '🔍'}
                                            {rec.type === 'celebrate' && '🎉'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground mb-1">{rec.title}</p>
                                            <p className="text-xs text-muted-foreground">{rec.reason}</p>
                                            {rec.expectedImpact && (
                                                <p className="text-xs text-green-500 mt-1">
                                                    💰 Expected impact: {rec.expectedImpact}
                                                </p>
                                            )}
                                        </div>
                                        {rec.priority === 'high' && (
                                            <FlagIcon className="w-4 h-4 text-red-500" />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* AI Insights Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'analytics_intelligence').map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => setInsights(prev => prev.filter(i => i._id !== insight._id))}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {insights.length === 0 && trends.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <ChartBarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">No analytics insights yet</p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Generate Analytics Intelligence
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportInsightsPanel;
