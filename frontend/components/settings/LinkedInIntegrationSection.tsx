"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ArrowPathIcon,
    TrashIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
    getLinkedInConnectUrl,
    getLinkedInStatus,
    disconnectLinkedIn,
    LinkedInStatus,
} from "@/lib/api/linkedinIntegration";
import toast from "react-hot-toast";

interface LinkedInIntegrationSectionProps {
    workspaceId: string;
}

// LinkedIn Logo Component
const LinkedInLogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
);

export default function LinkedInIntegrationSection({
    workspaceId,
}: LinkedInIntegrationSectionProps) {
    const [status, setStatus] = useState<LinkedInStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    useEffect(() => {
        loadStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const loadStatus = async () => {
        setLoading(true);
        const result = await getLinkedInStatus(workspaceId);
        if (result.success && result.data) {
            setStatus(result.data);
        } else {
            setStatus({
                connected: false,
                status: "Not Connected",
            });
        }
        setLoading(false);
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const result = await getLinkedInConnectUrl(workspaceId);
            if (result.success && result.data?.authUrl) {
                // Open in popup for better UX
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                const popup = window.open(
                    result.data.authUrl,
                    "LinkedIn OAuth",
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Poll for popup close
                const pollTimer = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(pollTimer);
                        setConnecting(false);
                        loadStatus();
                    }
                }, 500);
            } else {
                toast.error(result.error || "Failed to connect LinkedIn");
                setConnecting(false);
            }
        } catch (error) {
            toast.error("Failed to connect LinkedIn");
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect LinkedIn?")) {
            return;
        }

        setDisconnecting(true);
        try {
            const result = await disconnectLinkedIn(workspaceId);
            if (result.success) {
                toast.success("LinkedIn disconnected");
                setStatus({
                    connected: false,
                    status: "Not Connected",
                });
            } else {
                toast.error(result.error || "Failed to disconnect");
            }
        } catch (error) {
            toast.error("Failed to disconnect LinkedIn");
        } finally {
            setDisconnecting(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Connect LinkedIn Section */}
            <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                    LinkedIn Integration
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Connect your LinkedIn account to enrich contacts with LinkedIn data.
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-8 rounded-lg border border-border bg-background">
                        <ArrowPathIcon className="w-5 h-5 text-muted-foreground animate-spin" />
                    </div>
                ) : !status?.connected ? (
                    /* Not Connected State */
                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="flex items-center gap-3 p-4 w-full rounded-lg border border-border bg-background hover:bg-card hover:border-[#0A66C2]/50 transition-all group disabled:opacity-50"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                            <LinkedInLogo />
                        </div>
                        <div className="text-left flex-1">
                            <div className="text-sm font-medium text-foreground">
                                Connect LinkedIn
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Enable LinkedIn profile enrichment
                            </div>
                        </div>
                        {connecting && (
                            <ArrowPathIcon className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                    </button>
                ) : (
                    /* Connected State */
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-card/50 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                <LinkedInLogo />
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {status.profileInfo?.name ||
                                            status.profileInfo?.email ||
                                            "LinkedIn Connected"}
                                    </span>
                                    {status.status === "Connected" ? (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded text-[10px] text-green-400">
                                            <CheckCircleIcon className="w-2.5 h-2.5" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 rounded text-[10px] text-red-400">
                                            <ExclamationCircleIcon className="w-2.5 h-2.5" />
                                            {status.status}
                                        </span>
                                    )}
                                </div>
                                {status.profileInfo?.email && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {status.profileInfo.email}
                                    </div>
                                )}
                                {status.expiresAt && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Expires: {formatDate(status.expiresAt)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {status.status === "Expired" && (
                                <button
                                    onClick={handleConnect}
                                    disabled={connecting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2] text-white text-xs font-medium rounded-md hover:bg-[#0A66C2]/90 transition-colors disabled:opacity-50"
                                >
                                    <ArrowPathIcon
                                        className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`}
                                    />
                                    Reconnect
                                </button>
                            )}
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                                title="Disconnect"
                            >
                                {disconnecting ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <TrashIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Info about LinkedIn API limitations */}
            {status?.connected && (
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                        <UserCircleIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                                Note:
                            </span>{" "}
                            LinkedIn&apos;s API only allows fetching your own profile.
                            To enrich contacts with LinkedIn data, add their LinkedIn URL
                            and use the Apollo.io enrichment feature.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
