"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    UserGroupIcon,
    DocumentDuplicateIcon,
    ArrowsPointingInIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface DataQualityIntelligencePanelProps {
    workspaceId: string;
}

interface QualityMetrics {
    overallScore: number;
    completeness: number;
    accuracy: number;
    duplicateRate: number;
    issues: {
        type: string;
        count: number;
        severity: "high" | "medium" | "low";
    }[];
}

export const DataQualityIntelligencePanel: React.FC<DataQualityIntelligencePanelProps> = ({
    workspaceId,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [metrics, setMetrics] = useState<QualityMetrics | null>(null);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'data_quality', 'workspace');
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
            const response = await generateInsights(workspaceId, 'data_quality', 'workspace');
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
        const qualityInsight = insightsData.find(i => i.insights.type === 'data_health');
        if (qualityInsight?.insights.data) {
            setMetrics(qualityInsight.insights.data as QualityMetrics);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    // Mock data for display
    const displayMetrics: QualityMetrics = metrics || {
        overallScore: 76,
        completeness: 82,
        accuracy: 91,
        duplicateRate: 4,
        issues: [
            { type: "Missing phone numbers", count: 234, severity: "medium" },
            { type: "Duplicate contacts", count: 67, severity: "high" },
            { type: "Invalid email formats", count: 23, severity: "high" },
            { type: "Missing company data", count: 156, severity: "low" },
        ],
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Data Quality Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Scan"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Health Score */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center p-6 rounded-lg border border-border bg-card"
                    >
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <ShieldCheckIcon className={cn("w-6 h-6", {
                                "text-green-500": displayMetrics.overallScore >= 80,
                                "text-yellow-500": displayMetrics.overallScore >= 60 && displayMetrics.overallScore < 80,
                                "text-red-500": displayMetrics.overallScore < 60,
                            })} />
                            <span className="text-sm text-muted-foreground">CRM Health Score</span>
                        </div>
                        <span className={cn("text-5xl font-bold", {
                            "text-green-500": displayMetrics.overallScore >= 80,
                            "text-yellow-500": displayMetrics.overallScore >= 60 && displayMetrics.overallScore < 80,
                            "text-red-500": displayMetrics.overallScore < 60,
                        })}>
                            {displayMetrics.overallScore}
                        </span>
                        <span className="text-2xl text-muted-foreground">/100</span>
                    </motion.div>

                    {/* Sub-metrics */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-3 gap-2"
                    >
                        <div className="p-3 rounded-lg border border-border bg-card text-center">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto mb-1" />
                            <span className="text-lg font-bold text-foreground">{displayMetrics.completeness}%</span>
                            <p className="text-xs text-muted-foreground">Complete</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card text-center">
                            <ShieldCheckIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                            <span className="text-lg font-bold text-foreground">{displayMetrics.accuracy}%</span>
                            <p className="text-xs text-muted-foreground">Accurate</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card text-center">
                            <DocumentDuplicateIcon className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                            <span className="text-lg font-bold text-foreground">{displayMetrics.duplicateRate}%</span>
                            <p className="text-xs text-muted-foreground">Duplicates</p>
                        </div>
                    </motion.div>

                    {/* Issues List */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Issues Found</h4>
                        {displayMetrics.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                                <ExclamationTriangleIcon className={cn("w-5 h-5", {
                                    "text-red-500": issue.severity === "high",
                                    "text-yellow-500": issue.severity === "medium",
                                    "text-blue-500": issue.severity === "low",
                                })} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{issue.type}</p>
                                    <p className="text-xs text-muted-foreground">{issue.count} records affected</p>
                                </div>
                                <button className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20">
                                    Fix
                                </button>
                            </div>
                        ))}
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <ArrowsPointingInIcon className="w-5 h-5 text-purple-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Merge Duplicates</p>
                                <p className="text-xs text-muted-foreground">AI will identify and suggest merges</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Enrich Missing Data</p>
                                <p className="text-xs text-muted-foreground">Auto-fill from external sources</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <UserGroupIcon className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Validate Emails</p>
                                <p className="text-xs text-muted-foreground">Check for invalid email addresses</p>
                            </div>
                        </button>
                    </motion.div>

                    {/* Insight Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'data_health').map((insight) => (
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

export default DataQualityIntelligencePanel;
