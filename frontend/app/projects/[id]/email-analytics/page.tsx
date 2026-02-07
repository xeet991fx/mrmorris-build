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
    DevicePhoneMobileIcon,
    ComputerDesktopIcon,
    GlobeAltIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    getTrackingStats,
    getCampaignPerformance,
    getEmailDeviceBreakdown,
    getEmailLocationBreakdown,
    getEmailTimeBreakdown,
    EmailTrackingStats,
    CampaignPerformance,
    DeviceBreakdown,
    LocationBreakdown,
    TimeBreakdown,
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
        totalUnsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        bounceRate: 0,
        totalOpenEvents: 0,
        totalClickEvents: 0,
    });
    const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
    const [deviceData, setDeviceData] = useState<DeviceBreakdown | null>(null);
    const [locationData, setLocationData] = useState<LocationBreakdown | null>(null);
    const [timeData, setTimeData] = useState<TimeBreakdown | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, campaignsRes, deviceRes, locationRes, timeRes] = await Promise.all([
                getTrackingStats(workspaceId),
                getCampaignPerformance(workspaceId),
                getEmailDeviceBreakdown(workspaceId),
                getEmailLocationBreakdown(workspaceId),
                getEmailTimeBreakdown(workspaceId),
            ]);

            if (statsRes.success && statsRes.data) setStats(statsRes.data);
            if (campaignsRes.success && campaignsRes.campaigns) setCampaigns(campaignsRes.campaigns);
            if (deviceRes.success && deviceRes.data) setDeviceData(deviceRes.data);
            if (locationRes.success && locationRes.data) setLocationData(locationRes.data);
            if (timeRes.success && timeRes.data) setTimeData(timeRes.data);
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

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const deviceColors: Record<string, string> = {
        desktop: "bg-blue-500",
        mobile: "bg-purple-500",
        tablet: "bg-green-500",
        unknown: "bg-gray-500",
    };

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
                        Track email performance with device and location insights
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

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Device Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <DevicePhoneMobileIcon className="w-5 h-5 text-blue-400" />
                        Device Breakdown
                    </h3>
                    {deviceData?.devices && deviceData.devices.length > 0 ? (
                        <div className="space-y-3">
                            {deviceData.devices.map((device) => (
                                <div key={device.name} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-foreground capitalize">{device.name}</span>
                                            <span className="text-muted-foreground">{device.percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${deviceColors[device.name] || "bg-blue-500"} rounded-full transition-all`}
                                                style={{ width: `${device.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground w-12 text-right">
                                        {device.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No device data yet</p>
                    )}
                </motion.div>

                {/* Location Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <GlobeAltIcon className="w-5 h-5 text-green-400" />
                        Top Countries
                    </h3>
                    {locationData?.countries && locationData.countries.length > 0 ? (
                        <div className="space-y-2">
                            {locationData.countries.slice(0, 8).map((loc, i) => (
                                <div key={loc.country} className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                                        <span className="text-foreground">{loc.country}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{ width: `${loc.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-muted-foreground w-8 text-right">
                                            {loc.percentage}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No location data yet</p>
                    )}
                </motion.div>

                {/* Browser Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <ComputerDesktopIcon className="w-5 h-5 text-purple-400" />
                        Browser & OS
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Browsers</p>
                            {deviceData?.browsers?.slice(0, 4).map((b) => (
                                <div key={b.name} className="flex justify-between text-sm py-1">
                                    <span className="text-foreground capitalize">{b.name}</span>
                                    <span className="text-muted-foreground">{b.percentage}%</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">OS</p>
                            {deviceData?.os?.slice(0, 4).map((o) => (
                                <div key={o.name} className="flex justify-between text-sm py-1">
                                    <span className="text-foreground capitalize">{o.name}</span>
                                    <span className="text-muted-foreground">{o.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Hour of Day */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-orange-400" />
                        Best Time to Send
                    </h3>
                    {timeData?.byHour && timeData.byHour.length > 0 ? (
                        <div className="flex items-end h-32 gap-1">
                            {timeData.byHour.map((h) => {
                                const maxCount = Math.max(...timeData.byHour.map(x => x.count));
                                const height = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
                                return (
                                    <div
                                        key={h.hour}
                                        className="flex-1 bg-orange-500/20 hover:bg-orange-500/40 rounded-t transition-colors relative group"
                                        style={{ height: `${Math.max(height, 4)}%` }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-border px-2 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap">
                                            {h.label}: {h.count}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No time data yet</p>
                    )}
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>12am</span>
                        <span>6am</span>
                        <span>12pm</span>
                        <span>6pm</span>
                        <span>12am</span>
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
        </div>
    );
}
