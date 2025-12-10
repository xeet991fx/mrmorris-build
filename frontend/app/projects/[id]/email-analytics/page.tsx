"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowPathIcon,
    ChartBarIcon,
    EnvelopeIcon,
    EnvelopeOpenIcon,
    CursorArrowRaysIcon,
    ChatBubbleLeftRightIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    getTrackingStats,
    getCampaignPerformance,
    EmailTrackingStats,
    CampaignPerformance,
} from "@/lib/api/emailTracking";

export default function EmailAnalyticsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<EmailTrackingStats>({
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalReplied: 0,
        totalBounced: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
    });
    const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, campaignsRes] = await Promise.all([
                getTrackingStats(workspaceId),
                getCampaignPerformance(workspaceId),
            ]);

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
            if (campaignsRes.success && campaignsRes.campaigns) {
                setCampaigns(campaignsRes.campaigns);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
            toast.error("Failed to load analytics");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ChartBarIcon className="w-7 h-7 text-primary" />
                        Email Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track email performance across all campaigns
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                    <ArrowPathIcon className="w-5 h-5" />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Sent</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalSent.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <EnvelopeIcon className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Opened</p>
                            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.totalOpened.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{formatPercent(stats.openRate)} rate</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <EnvelopeOpenIcon className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Clicked</p>
                            <p className="text-2xl font-bold text-purple-400 mt-1">{stats.totalClicked.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{formatPercent(stats.clickRate)} rate</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                            <CursorArrowRaysIcon className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Replied</p>
                            <p className="text-2xl font-bold text-green-400 mt-1">{stats.totalReplied.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{formatPercent(stats.replyRate)} rate</p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                            <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Bounced</p>
                            <p className="text-2xl font-bold text-red-400 mt-1">{stats.totalBounced.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{formatPercent(stats.bounceRate)} rate</p>
                        </div>
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Campaign Performance Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Campaign Performance</h2>
                </div>
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Campaign</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Sent</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Opens</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Open Rate</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Clicks</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Click Rate</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Replies</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {campaigns.map((campaign) => (
                            <motion.tr
                                key={campaign.campaignId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-muted/30 transition-colors"
                            >
                                <td className="py-3 px-4 font-medium text-foreground">{campaign.campaignName}</td>
                                <td className="py-3 px-4 text-right text-foreground">{campaign.sent.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right text-blue-400">{campaign.opened.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                                        {formatPercent(campaign.openRate)}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right text-purple-400">{campaign.clicked.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                                        {formatPercent(campaign.clickRate)}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right text-green-400">{campaign.replied.toLocaleString()}</td>
                            </motion.tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                    No campaigns found. Create a campaign to start tracking.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Engagement Over Time</h2>
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                    <div className="text-center text-muted-foreground">
                        <ChartBarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Chart visualization coming soon</p>
                        <p className="text-xs mt-1">Track trends in opens, clicks, and replies over time</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
