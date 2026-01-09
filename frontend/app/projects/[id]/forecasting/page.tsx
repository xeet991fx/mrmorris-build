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

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading forecast...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Revenue Forecasting
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            AI-powered predictions and risk analysis
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm disabled:opacity-50"
                    >
                        <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </motion.div>

                {/* Period Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 flex items-center gap-2"
                >
                    {(['month', 'quarter', 'year'] as const).map(period => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                selectedPeriod === period
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                    ))}
                </motion.div>

                {/* Forecast Stats Row */}
                {forecast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-6 sm:mt-8 grid grid-cols-3 gap-4 sm:gap-8"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:block" />
                            <span className="text-xl sm:text-2xl font-bold text-emerald-500">
                                ${(forecast.forecast.committed / 1000).toFixed(0)}k
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-500">committed</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 hidden sm:block" />
                            <span className="text-xl sm:text-2xl font-bold text-blue-500">
                                ${(forecast.forecast.weightedPipeline / 1000).toFixed(0)}k
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-500">weighted</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 hidden sm:block" />
                            <span className="text-xl sm:text-2xl font-bold text-violet-500">
                                ${(forecast.forecast.bestCase / 1000).toFixed(0)}k
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-500">best case</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
                {/* Weekly Summary */}
                {summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarIcon className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Weekly Summary
                            </h3>
                            <span className="text-xs text-zinc-400 ml-auto">{summary.period}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{summary.metrics.newDeals}</p>
                                <p className="text-sm text-zinc-500">New Deals</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-500">{summary.metrics.dealsWon}</p>
                                <p className="text-sm text-zinc-500">Won</p>
                                <p className="text-xs text-zinc-400">${summary.metrics.wonValue.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{summary.metrics.winRate}%</p>
                                <p className="text-sm text-zinc-500">Win Rate</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    ${(summary.metrics.pipelineValue / 1000).toFixed(0)}k
                                </p>
                                <p className="text-sm text-zinc-500">Pipeline</p>
                                <p className="text-xs text-zinc-400">{summary.metrics.openPipeline} deals</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Trend Chart */}
                {trends && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <ChartBarIcon className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                    Trend Analysis
                                </h3>
                                {trends.trend.direction === 'up' && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                        <ArrowTrendingUpIcon className="w-3 h-3" />
                                        +{trends.trend.percentChange}%
                                    </span>
                                )}
                                {trends.trend.direction === 'down' && (
                                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                                        <ArrowTrendingDownIcon className="w-3 h-3" />
                                        {trends.trend.percentChange}%
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                                {(['revenue', 'deals_won', 'win_rate', 'avg_deal_size'] as const).map(metric => (
                                    <button
                                        key={metric}
                                        onClick={() => setSelectedMetric(metric)}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap",
                                            selectedMetric === metric
                                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                        )}
                                    >
                                        {metric.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends.periods}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                    <XAxis dataKey="period" stroke="#a1a1aa" fontSize={12} />
                                    <YAxis stroke="#a1a1aa" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e4e4e7',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ fill: '#10b981', r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                )}

                {/* At-Risk Deals */}
                {risks && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                At-Risk Deals
                            </h3>
                            <span className="text-xs text-zinc-400 ml-auto">
                                {risks.totalAtRisk} deals · ${risks.totalValueAtRisk.toLocaleString()}
                            </span>
                        </div>

                        {risks.deals.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-zinc-400">No high-risk deals found. Pipeline looks healthy!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {risks.deals.map((deal) => (
                                    <div
                                        key={deal.id}
                                        className="group py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{deal.title}</p>
                                                <p className="text-sm text-zinc-500">{deal.contact}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                    ${deal.value?.toLocaleString() || 0}
                                                </p>
                                                <span className={cn(
                                                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                                                    deal.riskScore > 60 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                                        deal.riskScore > 40 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                                            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                                                )}>
                                                    Risk: {deal.riskScore}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 mb-2">
                                            {deal.risks.map((risk, idx) => (
                                                <p key={idx} className="text-xs text-zinc-500">• {risk}</p>
                                            ))}
                                        </div>
                                        <div className="flex items-start gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Recommendation:</span>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{deal.recommendation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
