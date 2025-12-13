"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    TrashIcon,
    FireIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getGmailConnectUrl, getEmailIntegrations } from "@/lib/api/emailIntegration";

interface EmailAccount {
    _id: string;
    email: string;
    provider: "gmail" | "smtp";
    status: "active" | "warming_up" | "paused" | "error" | "disconnected";
    warmupEnabled: boolean;
    warmupCurrentDaily: number;
    warmupTargetDaily: number;
    dailySendLimit: number;
    sentToday: number;
    healthStatus?: "healthy" | "warning" | "critical";
    bounceRate?: number;
    openRate?: number;
    replyRate?: number;
    createdAt: string;
    isIntegration?: boolean; // Flag to identify if this is from email integrations
}

export default function EmailAccountsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState<"smtp" | "gmail">("smtp");

    // SMTP form state
    const [smtpForm, setSmtpForm] = useState({
        email: "",
        smtpHost: "",
        smtpPort: "587",
        smtpUser: "",
        smtpPassword: "",
    });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem("token");

            // Fetch cold email accounts
            const emailAccountsPromise = fetch(`${apiUrl}/email-accounts?workspaceId=${workspaceId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }).then(res => res.json()).catch(() => ({ success: false, accounts: [] }));

            // Fetch Gmail integrations from settings
            const integrationsPromise = getEmailIntegrations(workspaceId);

            const [emailAccountsData, integrationsData] = await Promise.all([
                emailAccountsPromise,
                integrationsPromise,
            ]);

            const coldEmailAccounts = emailAccountsData.success ? emailAccountsData.accounts || [] : [];

            // Convert integrations to match EmailAccount interface
            const integrationAccounts: EmailAccount[] = [];
            if (integrationsData.success && integrationsData.data?.integrations) {
                for (const integration of integrationsData.data.integrations) {
                    // Skip if already in cold email accounts
                    if (coldEmailAccounts.some((acc: EmailAccount) => acc.email === integration.email)) {
                        continue;
                    }
                    integrationAccounts.push({
                        _id: integration._id,
                        email: integration.email,
                        provider: "gmail",
                        status: integration.isActive ? "active" : "paused",
                        warmupEnabled: false,
                        warmupCurrentDaily: 0,
                        warmupTargetDaily: 0,
                        dailySendLimit: 100,
                        sentToday: 0,
                        healthStatus: "healthy",
                        createdAt: integration.createdAt,
                        isIntegration: true,
                    });
                }
            }

            setAccounts([...coldEmailAccounts, ...integrationAccounts]);
        } catch (error) {
            console.error("Failed to fetch email accounts:", error);
            toast.error("Failed to load email accounts");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnectSMTP = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/email-accounts/smtp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...smtpForm, workspaceId }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success("SMTP account connected successfully");
                setShowAddModal(false);
                setSmtpForm({
                    email: "",
                    smtpHost: "",
                    smtpPort: "587",
                    smtpUser: "",
                    smtpPassword: "",
                });
                fetchAccounts();
            } else {
                toast.error(data.message || "Failed to connect account");
            }
        } catch (error) {
            console.error("Failed to connect SMTP account:", error);
            toast.error("Failed to connect SMTP account");
        }
    };

    const handleToggleWarmup = async (accountId: string, enabled: boolean) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/email-accounts/${accountId}/warmup`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ warmupEnabled: enabled }),
            });
            const data = await response.json();
            if (data.success) {
                toast.success(enabled ? "Warmup enabled" : "Warmup disabled");
                fetchAccounts();
            }
        } catch (error) {
            console.error("Failed to toggle warmup:", error);
            toast.error("Failed to update warmup settings");
        }
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm("Are you sure you want to disconnect this email account?")) {
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/email-accounts/${accountId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Account disconnected");
                fetchAccounts();
            }
        } catch (error) {
            console.error("Failed to disconnect account:", error);
            toast.error("Failed to disconnect account");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                        <CheckCircleIcon className="w-3 h-3" /> Active
                    </span>
                );
            case "warming_up":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                        <FireIcon className="w-3 h-3" /> Warming Up
                    </span>
                );
            case "paused":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                        Paused
                    </span>
                );
            case "error":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                        <ExclamationCircleIcon className="w-3 h-3" /> Error
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                        {status}
                    </span>
                );
        }
    };

    const getHealthBadge = (health?: string) => {
        if (!health) return null;
        switch (health) {
            case "healthy":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                        Healthy
                    </span>
                );
            case "warning":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                        Warning
                    </span>
                );
            case "critical":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                        Critical
                    </span>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card/95">
            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <h1 className="text-lg font-semibold text-foreground">Email Accounts</h1>
                    <p className="text-xs text-muted-foreground">
                        Manage email accounts for outreach
                    </p>
                </motion.div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-background rounded-lg hover:bg-[#8AB82E] transition-all"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Account
                </button>
            </div>

            <div className="p-6 max-w-7xl mx-auto">

            {/* Accounts Grid */}
            {accounts.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No email accounts connected</h3>
                    <p className="text-muted-foreground mb-6">
                        Connect your first email account to start sending cold emails
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-background rounded-lg hover:bg-[#8AB82E] transition-all"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Connect Account
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((account) => (
                        <motion.div
                            key={account._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-xl p-5 hover:border-[#9ACD32]/50 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-medium text-foreground truncate max-w-[180px]">
                                            {account.email}
                                        </h3>
                                        <span className="text-xs uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {account.provider}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(account.status)}
                                        {getHealthBadge(account.healthStatus)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDisconnect(account._id)}
                                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                                    title="Disconnect"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-muted/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground">Sent Today</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {account.sentToday}/{account.dailySendLimit}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground">Open Rate</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {account.openRate?.toFixed(1) || 0}%
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-2 text-center">
                                    <p className="text-xs text-muted-foreground">Reply Rate</p>
                                    <p className="text-lg font-semibold text-foreground">
                                        {account.replyRate?.toFixed(1) || 0}%
                                    </p>
                                </div>
                            </div>

                            {/* Warmup Progress */}
                            {account.status === "warming_up" && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Warmup Progress</span>
                                        <span className="text-foreground">
                                            {account.warmupCurrentDaily}/{account.warmupTargetDaily} emails/day
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
                                            style={{
                                                width: `${(account.warmupCurrentDaily / account.warmupTargetDaily) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Warmup Toggle */}
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex items-center gap-2 text-sm">
                                    <FireIcon className="w-4 h-4 text-orange-400" />
                                    <span className="text-muted-foreground">Warmup</span>
                                </div>
                                {account.isIntegration ? (
                                    <span className="text-xs text-muted-foreground" title="Warmup is only available for SMTP accounts added in Email Accounts">
                                        N/A
                                    </span>
                                ) : (
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={account.warmupEnabled}
                                            onChange={(e) => handleToggleWarmup(account._id, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#9ACD32]"></div>
                                    </label>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add Account Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4"
                    >
                        <h2 className="text-xl font-semibold text-foreground mb-4">Add Email Account</h2>

                        {/* Account Type Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setAddType("smtp")}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${addType === "smtp"
                                    ? "bg-[#9ACD32] text-background"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                SMTP / IMAP
                            </button>
                            <button
                                onClick={() => setAddType("gmail")}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${addType === "gmail"
                                    ? "bg-[#9ACD32] text-background"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Gmail OAuth
                            </button>
                        </div>

                        {addType === "smtp" ? (
                            <form onSubmit={handleConnectSMTP} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={smtpForm.email}
                                        onChange={(e) => setSmtpForm({ ...smtpForm, email: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                                        placeholder="you@company.com"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            SMTP Host
                                        </label>
                                        <input
                                            type="text"
                                            value={smtpForm.smtpHost}
                                            onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                                            placeholder="smtp.example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            SMTP Port
                                        </label>
                                        <input
                                            type="number"
                                            value={smtpForm.smtpPort}
                                            onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                                            placeholder="587"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        SMTP Username
                                    </label>
                                    <input
                                        type="text"
                                        value={smtpForm.smtpUser}
                                        onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                                        placeholder="your-username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        SMTP Password
                                    </label>
                                    <input
                                        type="password"
                                        value={smtpForm.smtpPassword}
                                        onChange={(e) => setSmtpForm({ ...smtpForm, smtpPassword: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-[#9ACD32] text-background rounded-lg hover:bg-[#8AB82E] transition-all"
                                    >
                                        Connect
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                                        <path
                                            fill="#EA4335"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-2">
                                    Connect Gmail Account
                                </h3>
                                <p className="text-muted-foreground mb-6 text-sm">
                                    Connect your Gmail account using Google OAuth for secure email sending
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const result = await getGmailConnectUrl(workspaceId);
                                                if (result.success && result.data?.authUrl) {
                                                    window.location.href = result.data.authUrl;
                                                } else {
                                                    toast.error(result.error || "Failed to connect Gmail");
                                                }
                                            } catch (error) {
                                                toast.error("Failed to connect Gmail");
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                        </svg>
                                        Connect with Google
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
            </div>
        </div>
    );
}
