"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    EnvelopeIcon,
    ArrowPathIcon,
    TrashIcon,
    ExclamationCircleIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import {
    getGmailConnectUrl,
    getEmailIntegrations,
    disconnectEmailIntegration,
    syncEmails,
    EmailIntegration,
} from "@/lib/api/emailIntegration";
import toast from "react-hot-toast";

interface EmailIntegrationSettingsProps {
    workspaceId: string;
}

export default function EmailIntegrationSettings({
    workspaceId,
}: EmailIntegrationSettingsProps) {
    const router = useRouter();
    const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);


    useEffect(() => {
        loadIntegrations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const loadIntegrations = async () => {
        setLoading(true);
        const result = await getEmailIntegrations(workspaceId);
        if (result.success) {
            setIntegrations(result.data.integrations);
        }
        setLoading(false);
    };

    const handleConnectGmail = async () => {
        setConnecting(true);
        try {
            const result = await getGmailConnectUrl(workspaceId);
            if (result.success && result.data.authUrl) {
                window.location.href = result.data.authUrl;
            } else {
                toast.error(result.error || "Failed to connect Gmail");
            }
        } catch (error) {
            toast.error("Failed to connect Gmail");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async (integrationId: string) => {
        if (!confirm("Are you sure you want to disconnect this email account?")) {
            return;
        }

        const result = await disconnectEmailIntegration(integrationId);
        if (result.success) {
            toast.success("Email disconnected");
            loadIntegrations();
        } else {
            toast.error(result.error || "Failed to disconnect");
        }
    };

    const handleSync = async (integrationId: string) => {
        setSyncing(integrationId);
        try {
            const result = await syncEmails(integrationId);
            if (result.success) {
                toast.success(
                    `Synced ${result.data.activitiesCreated} emails as activities`
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

    return (
        <div className="min-h-screen bg-background px-8 pt-14 pb-8">
            {/* Breadcrumb */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-5 flex items-center gap-2 text-sm"
            >
                <button
                    onClick={() => router.push(`/projects/${workspaceId}`)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    Dashboard
                </button>
                <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground font-medium">Email Integration</span>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl font-bold text-foreground mb-1">
                    Email Integration
                </h1>
                <p className="text-sm text-muted-foreground">
                    Connect your email to automatically log communications as activities
                </p>
            </motion.div>

            {/* Connect Email Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">Connect Email Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gmail Card */}
                    <button
                        onClick={handleConnectGmail}
                        disabled={connecting}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-neutral-600 transition-all group disabled:opacity-50"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6">
                                <path
                                    fill="#EA4335"
                                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"
                                />
                                <path
                                    fill="#4A90E2"
                                    d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"
                                />
                            </svg>
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-sm font-medium text-foreground">Connect Gmail</div>
                            <div className="text-xs text-muted-foreground">Link your Google account</div>
                        </div>
                        {connecting && (
                            <ArrowPathIcon className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                    </button>

                    {/* Apollo.io Card */}
                    <button
                        onClick={() => router.push(`/projects/${workspaceId}/settings/apollo`)}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-neutral-600 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-sm font-medium text-foreground">Apollo.io</div>
                            <div className="text-xs text-muted-foreground">B2B data enrichment</div>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>

                    {/* Outlook Card - Coming Soon */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/30 opacity-50 cursor-not-allowed relative">
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                            Coming Soon
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6">
                                <path
                                    fill="#0078D4"
                                    d="M24 7.387v10.478c0 .23-.08.424-.238.576a.793.793 0 0 1-.574.234h-8.012v-6.78l1.456 1.073c.08.063.173.095.27.095.107 0 .203-.035.278-.11l.685-.614a.326.326 0 0 0 .108-.254.326.326 0 0 0-.108-.254l-3.656-2.732a.41.41 0 0 0-.27-.095H12v9.671H.812a.788.788 0 0 1-.574-.234A.77.77 0 0 1 0 17.865V7.387c0-.127.046-.254.142-.381L.812 6h22.376l.67 1.006c.096.127.142.254.142.381z"
                                />
                                <path
                                    fill="#0078D4"
                                    d="M24 5.5v.476L12 13.5 0 5.976V5.5c0-.225.08-.42.238-.573A.788.788 0 0 1 .812 4.7h22.376c.223 0 .416.076.574.227.158.153.238.348.238.573z"
                                />
                            </svg>
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-muted-foreground">Connect Outlook</div>
                            <div className="text-xs text-muted-foreground">Microsoft 365 integration</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Connected Accounts Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">Connected Accounts</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12 rounded-lg border border-border bg-card/50">
                        <div className="flex flex-col items-center gap-2">
                            <ArrowPathIcon className="w-6 h-6 text-muted-foreground animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading accounts...</p>
                        </div>
                    </div>
                ) : integrations.length === 0 ? (
                    <div className="text-center py-12 rounded-lg border border-border bg-card/50">
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                            <EnvelopeIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-medium text-foreground mb-1">
                            No accounts connected
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Connect your Gmail to start automatically syncing emails as activities
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
                                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                                                <path
                                                    fill="#EA4335"
                                                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"
                                                />
                                                <path
                                                    fill="#34A853"
                                                    d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"
                                                />
                                                <path
                                                    fill="#4A90E2"
                                                    d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"
                                                />
                                                <path
                                                    fill="#FBBC05"
                                                    d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067Z"
                                                />
                                            </svg>
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
            </motion.div>

            {/* How It Works Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { num: "1", title: "Smart Matching", desc: "Emails matched to contacts by address", icon: "📧" },
                        { num: "2", title: "Auto-Logging", desc: "Matched emails become activities", icon: "📝" },
                        { num: "3", title: "7-Day Sync", desc: "Each sync fetches last 7 days", icon: "🔄" },
                        { num: "4", title: "Secure Storage", desc: "Credentials encrypted with AES-256", icon: "🔒" },
                    ].map((item) => (
                        <div
                            key={item.num}
                            className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card/50"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-400 font-semibold text-sm">{item.num}</span>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-foreground">{item.title}</div>
                                <div className="text-xs text-muted-foreground">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Apollo Integration Benefits */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
            >
                <h2 className="text-lg font-semibold text-foreground mb-4">Apollo.io Benefits</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { title: "Contact Enrichment", desc: "Auto-fill missing emails, phones & LinkedIn profiles", icon: "✨" },
                        { title: "Company Data", desc: "Get industry, size, revenue & tech stack info", icon: "🏢" },
                        { title: "Email Verification", desc: "Verify emails before sending campaigns", icon: "✓" },
                        { title: "B2B Database", desc: "Search 275M+ contacts & companies", icon: "🔍" },
                        { title: "Smart Matching", desc: "Find contacts by title, location & company", icon: "🎯" },
                        { title: "Credit Tracking", desc: "Monitor usage with detailed analytics", icon: "📊" },
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card/50"
                        >
                            <div className="text-2xl">{item.icon}</div>
                            <div>
                                <div className="text-sm font-medium text-foreground">{item.title}</div>
                                <div className="text-xs text-muted-foreground">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
