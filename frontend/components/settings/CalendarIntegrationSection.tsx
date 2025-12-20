"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CalendarIcon,
    ArrowPathIcon,
    TrashIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
    getCalendarConnectUrl,
    getCalendarIntegrations,
    disconnectCalendarIntegration,
    syncCalendar,
    CalendarIntegration,
} from "@/lib/api/calendarIntegration";
import toast from "react-hot-toast";

interface CalendarIntegrationSectionProps {
    workspaceId: string;
}

export default function CalendarIntegrationSection({
    workspaceId,
}: CalendarIntegrationSectionProps) {
    const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);

    useEffect(() => {
        loadIntegrations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const loadIntegrations = async () => {
        setLoading(true);
        const result = await getCalendarIntegrations(workspaceId);
        if (result.success) {
            setIntegrations(result.data.integrations);
        }
        setLoading(false);
    };

    const handleConnectGoogle = async () => {
        setConnecting(true);
        try {
            const result = await getCalendarConnectUrl(workspaceId);
            if (result.success && result.data.authUrl) {
                window.location.href = result.data.authUrl;
            } else {
                toast.error(result.error || "Failed to connect Google Calendar");
            }
        } catch (error) {
            toast.error("Failed to connect Google Calendar");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async (integrationId: string) => {
        if (!confirm("Are you sure you want to disconnect this calendar?")) {
            return;
        }

        const result = await disconnectCalendarIntegration(integrationId);
        if (result.success) {
            toast.success("Calendar disconnected");
            loadIntegrations();
        } else {
            toast.error(result.error || "Failed to disconnect");
        }
    };

    const handleSync = async (integrationId: string) => {
        setSyncing(integrationId);
        try {
            const result = await syncCalendar(integrationId);
            if (result.success) {
                toast.success(
                    `Synced ${result.data.eventsSynced} events from calendar`
                );
                loadIntegrations();
            } else {
                toast.error(result.error || "Sync failed");
            }
        } catch (error) {
            toast.error("Sync failed");
        } finally {
            setSyncing(null);
        }
    };

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return "Never synced";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    // Google Calendar Logo
    const GoogleCalendarLogo = () => (
        <svg viewBox="0 0 200 200" className="w-6 h-6">
            <rect x="45" y="45" width="110" height="110" fill="#fff" rx="8" />
            <rect x="55" y="55" width="90" height="25" fill="#4285F4" rx="2" />
            <rect x="55" y="85" width="20" height="20" fill="#FBBC04" rx="2" />
            <rect x="80" y="85" width="20" height="20" fill="#34A853" rx="2" />
            <rect x="105" y="85" width="20" height="20" fill="#EA4335" rx="2" />
            <rect x="55" y="110" width="20" height="20" fill="#34A853" rx="2" />
            <rect x="80" y="110" width="20" height="20" fill="#4285F4" rx="2" />
            <rect x="105" y="110" width="20" height="20" fill="#FBBC04" rx="2" />
        </svg>
    );

    return (
        <div className="space-y-6">
            {/* Connect Calendar Section */}
            <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                    Connect Calendar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Google Calendar Card */}
                    <button
                        onClick={handleConnectGoogle}
                        disabled={connecting}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background hover:bg-card hover:border-neutral-600 transition-all group disabled:opacity-50"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <GoogleCalendarLogo />
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-sm font-medium text-foreground">
                                Connect Google Calendar
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Sync meetings & events
                            </div>
                        </div>
                        {connecting && (
                            <ArrowPathIcon className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                    </button>

                    {/* Outlook Card - Coming Soon */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background/30 opacity-50 cursor-not-allowed relative">
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                            Coming Soon
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6">
                                <path
                                    fill="#0078D4"
                                    d="M24 7.387v10.478c0 .23-.08.424-.238.576a.793.793 0 0 1-.574.234h-8.012v-6.78l1.456 1.073c.08.063.173.095.27.095.107 0 .203-.035.278-.11l.685-.614a.326.326 0 0 0 .108-.254.326.326 0 0 0-.108-.254l-3.656-2.732a.41.41 0 0 0-.27-.095H12v9.671H.812a.788.788 0 0 1-.574-.234A.77.77 0 0 1 0 17.865V7.387c0-.127.046-.254.142-.381L.812 6h22.376l.67 1.006c.096.127.142.254.142.381z"
                                />
                            </svg>
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-muted-foreground">
                                Connect Outlook
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Microsoft 365 calendar
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Connected Calendars Section */}
            <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                    Connected Calendars
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-12 rounded-lg border border-border bg-background">
                        <div className="flex flex-col items-center gap-2">
                            <ArrowPathIcon className="w-6 h-6 text-muted-foreground animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading calendars...</p>
                        </div>
                    </div>
                ) : integrations.length === 0 ? (
                    <div className="text-center py-12 rounded-lg border border-border bg-background">
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                            <CalendarIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium text-foreground mb-1">
                            No calendars connected
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Connect your Google Calendar to sync meetings and schedule events
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {integrations.map((integration, index) => (
                                <motion.div
                                    key={integration._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-card/50 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                            <GoogleCalendarLogo />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground">
                                                    {integration.email}
                                                </span>
                                                {integration.isActive ? (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded text-[10px] text-green-400">
                                                        <CheckCircleIcon className="w-2.5 h-2.5" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 rounded text-[10px] text-red-400">
                                                        <ExclamationCircleIcon className="w-2.5 h-2.5" />
                                                        Error
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                Last synced: {formatTimeAgo(integration.lastSyncAt)}
                                            </div>
                                            {integration.syncError && (
                                                <p className="text-[10px] text-red-400 mt-0.5">
                                                    {integration.syncError}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSync(integration._id)}
                                            disabled={syncing === integration._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            <ArrowPathIcon
                                                className={`w-3.5 h-3.5 ${syncing === integration._id ? "animate-spin" : ""
                                                    }`}
                                            />
                                            {syncing === integration._id ? "Syncing..." : "Sync Now"}
                                        </button>
                                        <button
                                            onClick={() => handleDisconnect(integration._id)}
                                            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                            title="Disconnect"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
