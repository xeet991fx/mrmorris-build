"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    BuildingOffice2Icon,
    HeartIcon,
    ExclamationTriangleIcon,
    UserGroupIcon,
    ChartBarIcon,
    LightBulbIcon,
    CurrencyDollarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";

interface CompanyIntelligencePanelProps {
    workspaceId: string;
    companies?: any[];
}

interface AccountHealth {
    companyId: string;
    companyName: string;
    healthScore: number;
    status: 'excellent' | 'good' | 'at-risk' | 'critical';
    factors: {
        engagement: number;
        revenue: number;
        growth: number;
        satisfaction: number;
    };
    trend: 'improving' | 'stable' | 'declining';
}

interface ChurnRisk {
    companyId: string;
    companyName: string;
    riskLevel: 'high' | 'medium' | 'low';
    churnProbability: number;
    indicators: string[];
    recommendedActions: string[];
    estimatedImpact: number;
}

interface ExpansionOpportunity {
    companyId: string;
    companyName: string;
    opportunityType: 'upsell' | 'cross-sell' | 'renewal' | 'referral';
    potential: number;
    readiness: number;
    reasoning: string;
    suggestedApproach: string;
    timeline: string;
}

interface Stakeholder {
    name: string;
    role: string;
    influence: 'high' | 'medium' | 'low';
    sentiment: 'champion' | 'supporter' | 'neutral' | 'detractor';
    lastContact: string;
}

export const CompanyIntelligencePanel: React.FC<CompanyIntelligencePanelProps> = ({
    workspaceId,
    companies = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [accountHealth, setAccountHealth] = useState<AccountHealth[]>([]);
    const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
    const [expansionOpportunities, setExpansionOpportunities] = useState<ExpansionOpportunity[]>([]);
    const [stakeholderMap, setStakeholderMap] = useState<Record<string, Stakeholder[]>>({});

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'account');
            if (response.success) {
                setInsights(response.data);
                processAccountInsights(response.data);
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
            const response = await generateInsights(workspaceId, 'account');
            if (response.success) {
                setInsights(response.data);
                processAccountInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const processAccountInsights = (insightsData: Insight[]) => {
        const accountInsight = insightsData.find(i => i.insights.type === 'account_intelligence');
        if (accountInsight?.insights.data) {
            setAccountHealth(accountInsight.insights.data.accountHealth || []);
            setChurnRisks(accountInsight.insights.data.churnRisks || []);
            setExpansionOpportunities(accountInsight.insights.data.expansionOpportunities || []);
            setStakeholderMap(accountInsight.insights.data.stakeholderMap || {});
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [workspaceId]);

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'excellent': return 'text-gray-600 bg-gray-500/10';
            case 'good': return 'text-blue-500 bg-blue-500/10';
            case 'at-risk': return 'text-orange-500 bg-orange-500/10';
            case 'critical': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'high': return 'border-red-500 bg-red-500/10';
            case 'medium': return 'border-orange-500 bg-orange-500/10';
            case 'low': return 'border-gray-500 bg-gray-500/10';
            default: return 'border-gray-500 bg-gray-500/10';
        }
    };

    const getOpportunityIcon = (type: string) => {
        switch (type) {
            case 'upsell': return <ArrowTrendingUpIcon className="w-5 h-5 text-gray-600" />;
            case 'cross-sell': return <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />;
            case 'renewal': return <ShieldCheckIcon className="w-5 h-5 text-purple-500" />;
            case 'referral': return <UserGroupIcon className="w-5 h-5 text-yellow-500" />;
            default: return <LightBulbIcon className="w-5 h-5 text-gray-500" />;
        }
    };

    const getSentimentEmoji = (sentiment: string) => {
        switch (sentiment) {
            case 'champion': return '🌟';
            case 'supporter': return '👍';
            case 'neutral': return '😐';
            case 'detractor': return '⚠️';
            default: return '❓';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-foreground">Account Intelligence</h3>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Account Health Overview */}
                    {accountHealth.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <HeartIcon className="w-5 h-5 text-pink-500" />
                                <span className="font-semibold text-foreground">Account Health</span>
                            </div>
                            <div className="space-y-3">
                                {accountHealth.slice(0, 5).map((account, idx) => (
                                    <motion.div
                                        key={account.companyId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">{account.companyName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                                        getHealthColor(account.status)
                                                    )}>
                                                        {account.status}
                                                    </span>
                                                    {account.trend === 'improving' && (
                                                        <span className="text-xs text-gray-600 flex items-center gap-1">
                                                            <ArrowTrendingUpIcon className="w-3 h-3" />
                                                            Improving
                                                        </span>
                                                    )}
                                                    {account.trend === 'declining' && (
                                                        <span className="text-xs text-red-500 flex items-center gap-1">
                                                            <ArrowTrendingDownIcon className="w-3 h-3" />
                                                            Declining
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-foreground">{account.healthScore}</p>
                                                <p className="text-xs text-muted-foreground">Health Score</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-3">
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">{account.factors.engagement}%</p>
                                                <p className="text-xs text-muted-foreground">Engagement</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">{account.factors.revenue}%</p>
                                                <p className="text-xs text-muted-foreground">Revenue</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">{account.factors.growth}%</p>
                                                <p className="text-xs text-muted-foreground">Growth</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-foreground">{account.factors.satisfaction}%</p>
                                                <p className="text-xs text-muted-foreground">Satisfaction</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Churn Risk Alerts */}
                    {churnRisks.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                                <span className="font-semibold text-foreground">Churn Risk Alerts</span>
                            </div>
                            <div className="space-y-3">
                                {churnRisks.map((risk, idx) => (
                                    <motion.div
                                        key={risk.companyId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "p-3 rounded-lg border-l-4",
                                            getRiskColor(risk.riskLevel)
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-medium text-foreground">{risk.companyName}</span>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium uppercase",
                                                        risk.riskLevel === 'high' ? 'bg-red-500/20 text-red-500' :
                                                            risk.riskLevel === 'medium' ? 'bg-orange-500/20 text-orange-500' :
                                                                'bg-gray-500/20 text-gray-600'
                                                    )}>
                                                        {risk.riskLevel} risk
                                                    </span>
                                                    <span className="text-sm font-bold text-red-500">
                                                        {risk.churnProbability}% churn probability
                                                    </span>
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Warning Signs:</p>
                                                    {risk.indicators.map((indicator, i) => (
                                                        <p key={i} className="text-xs text-foreground">• {indicator}</p>
                                                    ))}
                                                </div>
                                                <div className="mb-2">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Actions:</p>
                                                    {risk.recommendedActions.map((action, i) => (
                                                        <div key={i} className="flex items-start gap-2 mb-1">
                                                            <LightBulbIcon className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                                            <p className="text-xs text-foreground">{action}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-red-500 font-medium">
                                                    💰 At-risk revenue: ${(risk.estimatedImpact / 1000).toFixed(0)}K
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Expansion Opportunities */}
                    {expansionOpportunities.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowTrendingUpIcon className="w-5 h-5 text-gray-600" />
                                <span className="font-semibold text-foreground">Expansion Opportunities</span>
                            </div>
                            <div className="space-y-3">
                                {expansionOpportunities.map((opp, idx) => (
                                    <motion.div
                                        key={opp.companyId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50 bg-gradient-to-r from-gray-500/5 to-transparent"
                                    >
                                        <div className="flex items-start gap-3">
                                            {getOpportunityIcon(opp.opportunityType)}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="font-medium text-foreground">{opp.companyName}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{opp.opportunityType}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-gray-700 dark:text-gray-400">
                                                            ${(opp.potential / 1000).toFixed(0)}K
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{opp.readiness}% ready</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-foreground mb-2">{opp.reasoning}</p>
                                                <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                                                    <LightBulbIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                                    <p className="text-xs text-foreground">{opp.suggestedApproach}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Timeline: {opp.timeline}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Stakeholder Mapping */}
                    {Object.keys(stakeholderMap).length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <UserGroupIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-foreground">Key Stakeholders</span>
                            </div>
                            <div className="space-y-4">
                                {Object.entries(stakeholderMap).slice(0, 3).map(([companyName, stakeholders], idx) => (
                                    <motion.div
                                        key={companyName}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="p-3 rounded border border-border/50"
                                    >
                                        <p className="font-medium text-foreground mb-3">{companyName}</p>
                                        <div className="space-y-2">
                                            {stakeholders.map((stakeholder, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{getSentimentEmoji(stakeholder.sentiment)}</span>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">{stakeholder.name}</p>
                                                            <p className="text-xs text-muted-foreground">{stakeholder.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-xs font-medium",
                                                            stakeholder.influence === 'high' ? 'bg-purple-500/20 text-purple-500' :
                                                                stakeholder.influence === 'medium' ? 'bg-blue-500/20 text-blue-500' :
                                                                    'bg-gray-500/20 text-gray-500'
                                                        )}>
                                                            {stakeholder.influence} influence
                                                        </span>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {stakeholder.lastContact}
                                                        </p>
                                                    </div>
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
                        {insights.filter(i => i.insights.type !== 'account_intelligence').map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => setInsights(prev => prev.filter(i => i._id !== insight._id))}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {insights.length === 0 && accountHealth.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <BuildingOffice2Icon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">No account insights yet</p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                                Generate Account Intelligence
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CompanyIntelligencePanel;
