"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    ChartBarIcon,
    LightBulbIcon,
    ScaleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface LeadScoreIntelligencePanelProps {
    workspaceId: string;
    contactId?: string;
    leads?: any[];
}

interface ScoreBreakdown {
    factor: string;
    impact: number;
    description: string;
}

export const LeadScoreIntelligencePanel: React.FC<LeadScoreIntelligencePanelProps> = ({
    workspaceId,
    contactId,
    leads = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown[]>([]);
    const [currentScore, setCurrentScore] = useState<number | null>(null);

    const fetchInsights = async () => {
        if (!contactId) return;

        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'lead_score', contactId);
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
        if (!contactId) return;

        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'lead_score', contactId);
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
        const scoreInsight = insightsData.find(i => i.insights.type === 'score_explanation');
        if (scoreInsight?.insights.data) {
            setCurrentScore(scoreInsight.insights.data.score);
            setScoreBreakdown(scoreInsight.insights.data.breakdown || []);
        }
    };

    useEffect(() => {
        if (contactId) {
            fetchInsights();
        }
    }, [contactId, workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    // Mock data for display
    const mockBreakdown: ScoreBreakdown[] = scoreBreakdown.length > 0 ? scoreBreakdown : [
        { factor: "Email engagement", impact: 20, description: "Opened 5/8 emails" },
        { factor: "Company size", impact: 15, description: "Enterprise (500+ employees)" },
        { factor: "Website visits", impact: 12, description: "Visited pricing page 3x" },
        { factor: "Demo request", impact: 25, description: "Requested product demo" },
        { factor: "Industry fit", impact: 10, description: "SaaS/Tech company" },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Lead Score Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !contactId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {/* No Contact Selected */}
            {!contactId && (
                <div className="text-center py-8">
                    <ScaleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select a lead to see score insights</p>
                </div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && contactId && (
                <>
                    {/* Score Display */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center p-6 rounded-lg border border-border bg-card"
                    >
                        <p className="text-sm text-muted-foreground mb-2">Lead Score</p>
                        <div className="relative w-32 h-32 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-muted"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${(currentScore || 85) * 3.52} 352`}
                                    className={cn({
                                        "text-green-500": (currentScore || 85) >= 70,
                                        "text-yellow-500": (currentScore || 85) >= 40 && (currentScore || 85) < 70,
                                        "text-red-500": (currentScore || 85) < 40,
                                    })}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn("text-4xl font-bold", {
                                    "text-green-500": (currentScore || 85) >= 70,
                                    "text-yellow-500": (currentScore || 85) >= 40 && (currentScore || 85) < 70,
                                    "text-red-500": (currentScore || 85) < 40,
                                })}>
                                    {currentScore || 85}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-green-500 mt-2 flex items-center justify-center gap-1">
                            <ArrowTrendingUpIcon className="w-4 h-4" />
                            +12 from last week
                        </p>
                    </motion.div>

                    {/* Score Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Score Breakdown</h4>
                        {mockBreakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", {
                                    "bg-green-500/10 text-green-500": item.impact > 0,
                                    "bg-red-500/10 text-red-500": item.impact < 0,
                                })}>
                                    {item.impact > 0 ? '+' : ''}{item.impact}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{item.factor}</p>
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Contact Now</p>
                                <p className="text-xs text-muted-foreground">Score increased 45→85 - ideal time to reach out</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left">
                            <AdjustmentsHorizontalIcon className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Calibrate Model</p>
                                <p className="text-xs text-muted-foreground">Current accuracy: 74% - add more signals</p>
                            </div>
                        </button>
                    </motion.div>

                    {/* Insight Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'score_explanation').map((insight) => (
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

export default LeadScoreIntelligencePanel;
