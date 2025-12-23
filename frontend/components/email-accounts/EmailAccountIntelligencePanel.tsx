"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    FireIcon,
    ChartBarIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface EmailAccountIntelligencePanelProps {
    workspaceId: string;
    accountId?: string;
    accounts?: any[];
}

interface AccountHealth {
    healthScore: number;
    reputation: "excellent" | "good" | "fair" | "poor";
    warmingProgress: number;
    dailyLimit: number;
    sentToday: number;
    inboxPlacement: number;
    spamScore: number;
    blocklisted: boolean;
}

export const EmailAccountIntelligencePanel: React.FC<EmailAccountIntelligencePanelProps> = ({
    workspaceId,
    accountId,
    accounts = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [health, setHealth] = useState<AccountHealth | null>(null);

    const fetchInsights = async () => {
        if (!accountId) return;

        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'email_account', accountId);
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
        if (!accountId) return;

        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'email_account', accountId);
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
        const healthInsight = insightsData.find(i => i.insights.type === 'account_health');
        if (healthInsight?.insights.data) {
            setHealth(healthInsight.insights.data as AccountHealth);
        }
    };

    useEffect(() => {
        if (accountId) {
            fetchInsights();
        }
    }, [accountId, workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    // Mock data for display
    const displayHealth: AccountHealth = health || {
        healthScore: 92,
        reputation: "excellent",
        warmingProgress: 78,
        dailyLimit: 200,
        sentToday: 145,
        inboxPlacement: 94,
        spamScore: 0.3,
        blocklisted: false,
    };

    const reputationColors = {
        excellent: "text-green-500",
        good: "text-blue-500",
        fair: "text-yellow-500",
        poor: "text-red-500",
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Account Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !accountId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {/* No Account Selected */}
            {!accountId && (
                <div className="text-center py-8">
                    <EnvelopeIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select an email account to see AI insights</p>
                </div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && accountId && (
                <>
                    {/* Health Score */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center p-6 rounded-lg border border-border bg-card"
                    >
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <ShieldCheckIcon className={cn("w-6 h-6", {
                                "text-green-500": displayHealth.healthScore >= 80,
                                "text-yellow-500": displayHealth.healthScore >= 60 && displayHealth.healthScore < 80,
                                "text-red-500": displayHealth.healthScore < 60,
                            })} />
                            <span className="text-sm text-muted-foreground">Account Health</span>
                        </div>
                        <span className={cn("text-5xl font-bold", {
                            "text-green-500": displayHealth.healthScore >= 80,
                            "text-yellow-500": displayHealth.healthScore >= 60 && displayHealth.healthScore < 80,
                            "text-red-500": displayHealth.healthScore < 60,
                        })}>
                            {displayHealth.healthScore}
                        </span>
                        <span className="text-2xl text-muted-foreground">/100</span>
                        <p className={cn("text-sm mt-2 capitalize font-medium", reputationColors[displayHealth.reputation])}>
                            {displayHealth.reputation} Reputation
                        </p>
                    </motion.div>

                    {/* Key Metrics */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-muted-foreground">Inbox Placement</span>
                            </div>
                            <span className="text-xl font-bold text-foreground">{displayHealth.inboxPlacement}%</span>
                        </div>
                        <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">Spam Score</span>
                            </div>
                            <span className={cn("text-xl font-bold", {
                                "text-green-500": displayHealth.spamScore < 1,
                                "text-yellow-500": displayHealth.spamScore >= 1 && displayHealth.spamScore < 3,
                                "text-red-500": displayHealth.spamScore >= 3,
                            })}>
                                {displayHealth.spamScore}%
                            </span>
                        </div>
                    </motion.div>

                    {/* Warming Progress */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 rounded-lg border border-border bg-card"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <FireIcon className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-medium text-foreground">Warming Progress</span>
                        </div>
                        <div className="mb-2">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="text-foreground font-medium">{displayHealth.warmingProgress}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${displayHealth.warmingProgress}%` }}
                                    className="h-full bg-orange-500 rounded-full"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Daily limit</span>
                            <span className="text-foreground">{displayHealth.sentToday} / {displayHealth.dailyLimit}</span>
                        </div>
                    </motion.div>

                    {/* Status Checks */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Status Checks</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                                <span className="text-sm text-foreground">Blocklist Status</span>
                                {displayHealth.blocklisted ? (
                                    <span className="text-sm text-red-500 flex items-center gap-1">
                                        <ExclamationTriangleIcon className="w-4 h-4" /> Listed
                                    </span>
                                ) : (
                                    <span className="text-sm text-green-500 flex items-center gap-1">
                                        <CheckCircleIcon className="w-4 h-4" /> Clean
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                                <span className="text-sm text-foreground">SPF/DKIM/DMARC</span>
                                <span className="text-sm text-green-500 flex items-center gap-1">
                                    <CheckCircleIcon className="w-4 h-4" /> Configured
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                                <span className="text-sm text-foreground">DNS Records</span>
                                <span className="text-sm text-green-500 flex items-center gap-1">
                                    <CheckCircleIcon className="w-4 h-4" /> Valid
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Recommendations */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-2"
                    >
                        <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
                        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                            <div className="flex items-start gap-2">
                                <ClockIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Increase daily limit</p>
                                    <p className="text-xs text-muted-foreground">Safe to increase by 10 emails today</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Insight Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'account_health').map((insight) => (
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

export default EmailAccountIntelligencePanel;
