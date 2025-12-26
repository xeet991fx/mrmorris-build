"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationTriangleIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    ArrowPathIcon,
    ChartPieIcon,
} from "@heroicons/react/24/outline";
import { getForecast, getTrends, getRisks, getSummary, ForecastData, TrendData, RiskData, SummaryData } from "@/lib/api/forecast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export default function ForecastingPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [forecast, setForecast] = useState<ForecastData | null>(null);
    const [trends, setTrends] = useState<TrendData | null>(null);
    const [risks, setRisks] = useState<RiskData | null>(null);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'deals_won' | 'avg_deal_size' | 'win_rate'>('revenue');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [forecastRes, trendsRes, risksRes, summaryRes] = await Promise.all([
                getForecast(workspaceId, selectedPeriod),
                getTrends(workspaceId, selectedMetric, 6),
                getRisks(workspaceId, 30),
                getSummary(workspaceId, 'weekly'),
            ]);

            if (forecastRes.success) setForecast(forecastRes.data);
            if (trendsRes.success) setTrends(trendsRes.data);
            if (risksRes.success) setRisks(risksRes.data);
            if (summaryRes.success) setSummary(summaryRes.data);
        } catch (error) {
            console.error("Error loading forecast data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [workspaceId, selectedPeriod, selectedMetric]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Revenue Forecasting</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        AI-powered revenue predictions and deal risk analysis
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
                {(['month', 'quarter', 'year'] as const).map(period => (
                    <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-colors",
                            selectedPeriod === period
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                    >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Forecast Summary Cards */}
                    {forecast && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-lg border border-border bg-card"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-green-500/10">
                                        <CurrencyDollarIcon className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Committed</p>
                                        <p className="text-xs text-muted-foreground">High confidence ({forecast.forecast.dealCount} deals)</p>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-foreground">
                                    ${forecast.forecast.committed.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">{forecast.period}</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="p-6 rounded-lg border border-border bg-card"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10">
                                        <ChartPieIcon className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Weighted Pipeline</p>
                                        <p className="text-xs text-muted-foreground">Probability-adjusted</p>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-foreground">
                                    ${forecast.forecast.weightedPipeline.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">{forecast.period}</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-6 rounded-lg border border-border bg-card"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <ArrowTrendingUpIcon className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Best Case</p>
                                        <p className="text-xs text-muted-foreground">If all deals close</p>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-foreground">
                                    ${forecast.forecast.bestCase.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">{forecast.period}</p>
                            </motion.div>
                        </div>
                    )}

                    {/* Summary Metrics */}
                    {summary && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-6 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold text-foreground">Weekly Summary</h2>
                                <span className="text-sm text-muted-foreground ml-auto">{summary.period}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">New Deals</p>
                                    <p className="text-2xl font-bold text-foreground">{summary.metrics.newDeals}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Won</p>
                                    <p className="text-2xl font-bold text-green-500">{summary.metrics.dealsWon}</p>
                                    <p className="text-xs text-muted-foreground">${summary.metrics.wonValue.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Win Rate</p>
                                    <p className="text-2xl font-bold text-foreground">{summary.metrics.winRate}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Pipeline Value</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        ${summary.metrics.pipelineValue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{summary.metrics.openPipeline} deals</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Trend Chart */}
                    {trends && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-6 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <ChartBarIcon className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-foreground">Trend Analysis</h2>
                                </div>
                                <div className="flex gap-2">
                                    {(['revenue', 'deals_won', 'win_rate', 'avg_deal_size'] as const).map(metric => (
                                        <button
                                            key={metric}
                                            onClick={() => setSelectedMetric(metric)}
                                            className={cn(
                                                "px-3 py-1 rounded text-sm font-medium transition-colors",
                                                selectedMetric === metric
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                                            )}
                                        >
                                            {metric.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                {trends.trend.direction === 'up' && (
                                    <>
                                        <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                                        <span className="text-sm text-green-500 font-medium">
                                            +{trends.trend.percentChange}% trend
                                        </span>
                                    </>
                                )}
                                {trends.trend.direction === 'down' && (
                                    <>
                                        <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                                        <span className="text-sm text-red-500 font-medium">
                                            {trends.trend.percentChange}% trend
                                        </span>
                                    </>
                                )}
                                {trends.trend.direction === 'stable' && (
                                    <span className="text-sm text-muted-foreground font-medium">Stable trend</span>
                                )}
                            </div>

                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trends.periods}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="period"
                                        stroke="hsl(var(--muted-foreground))"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="hsl(var(--muted-foreground))"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {/* At-Risk Deals */}
                    {risks && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="p-6 rounded-lg border border-border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
                                <h2 className="text-lg font-semibold text-foreground">At-Risk Deals</h2>
                                <span className="ml-auto text-sm text-muted-foreground">
                                    {risks.totalAtRisk} deals at risk ($
{risks.totalValueAtRisk.toLocaleString()})
                                </span>
                            </div>

                            {risks.deals.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No high-risk deals found. Pipeline looks healthy!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {risks.deals.map((deal) => (
                                        <div
                                            key={deal.id}
                                            className="p-4 rounded-lg border border-border bg-muted/30"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-foreground">{deal.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{deal.contact}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-foreground">
                                                        ${deal.value?.toLocaleString() || 0}
                                                    </p>
                                                    <div className={cn(
                                                        "inline-block px-2 py-0.5 rounded text-xs font-medium",
                                                        deal.riskScore > 60 ? "bg-red-500/20 text-red-500" :
                                                        deal.riskScore > 40 ? "bg-orange-500/20 text-orange-500" :
                                                        "bg-yellow-500/20 text-yellow-500"
                                                    )}>
                                                        Risk: {deal.riskScore}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1 mb-2">
                                                {deal.risks.map((risk, idx) => (
                                                    <p key={idx} className="text-xs text-muted-foreground">• {risk}</p>
                                                ))}
                                            </div>
                                            <div className="p-2 rounded bg-muted text-xs text-foreground">
                                                <strong>Recommendation:</strong> {deal.recommendation}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
