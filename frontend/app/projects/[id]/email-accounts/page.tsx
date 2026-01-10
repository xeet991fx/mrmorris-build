"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { Mail, Flame, TrendingUp, Send, RefreshCw, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { getGmailConnectUrl, getEmailIntegrations } from "@/lib/api/emailIntegration";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

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
    isIntegration?: boolean;
}

export default function EmailAccountsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState<"smtp" | "gmail">("smtp");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

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

            const emailAccountsPromise = fetch(`${apiUrl}/email-accounts?workspaceId=${workspaceId}`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then(res => res.json()).catch(() => ({ success: false, accounts: [] }));

            const integrationsPromise = getEmailIntegrations(workspaceId);

            const [emailAccountsData, integrationsData] = await Promise.all([
                emailAccountsPromise,
                integrationsPromise,
            ]);

            const coldEmailAccounts = emailAccountsData.success ? emailAccountsData.accounts || [] : [];

            const integrationAccounts: EmailAccount[] = [];
            if (integrationsData.success && integrationsData.data?.integrations) {
                for (const integration of integrationsData.data.integrations) {
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
                setSmtpForm({ email: "", smtpHost: "", smtpPort: "587", smtpUser: "", smtpPassword: "" });
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

    const handleDisconnect = async () => {
        if (!accountToDelete) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/email-accounts/${accountToDelete}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                toast.success("Account disconnected");
                fetchAccounts();
            }
        } catch (error) {
            console.error("Failed to disconnect account:", error);
            toast.error("Failed to disconnect account");
        } finally {
            setAccountToDelete(null);
        }
    };

    const openDisconnectConfirm = (accountId: string) => {
        setAccountToDelete(accountId);
        setDeleteConfirmOpen(true);
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon?: React.ReactNode }> = {
            active: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: <CheckCircleIcon className="w-3 h-3" /> },
            warming_up: { bg: "bg-amber-500/10", text: "text-amber-500", icon: <Flame className="w-3 h-3" /> },
            paused: { bg: "bg-zinc-500/10", text: "text-zinc-500" },
            error: { bg: "bg-rose-500/10", text: "text-rose-500", icon: <ExclamationCircleIcon className="w-3 h-3" /> },
        };
        const badge = badges[status] || badges.paused;
        return (
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", badge.bg, badge.text)}>
                {badge.icon}
                {status === "warming_up" ? "Warming Up" : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getHealthBadge = (health?: string) => {
        if (!health) return null;
        const badges: Record<string, { bg: string; text: string }> = {
            healthy: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
            warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
            critical: { bg: "bg-rose-500/10", text: "text-rose-500" },
        };
        const badge = badges[health] || badges.healthy;
        return (
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", badge.bg, badge.text)}>
                {health.charAt(0).toUpperCase() + health.slice(1)}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-500">Loading email accounts...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-900">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-500" />
                        <div>
                            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Email Accounts</h1>
                            <p className="text-xs text-zinc-500">{accounts.length} connected accounts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchAccounts()}
                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Account
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="p-6 max-w-7xl mx-auto">
                {accounts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <Mail className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No email accounts connected</h3>
                        <p className="text-zinc-500 mb-6">Connect your first email account to start sending cold emails</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Connect Account
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts.map((account, index) => (
                            <motion.div
                                key={account._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors"
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{account.email}</h3>
                                            <span className="text-[10px] uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                                {account.provider}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(account.status)}
                                            {getHealthBadge(account.healthStatus)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openDisconnectConfirm(account._id)}
                                        className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Send className="w-3 h-3 text-blue-500" />
                                        </div>
                                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{account.sentToday}</p>
                                        <p className="text-[10px] text-zinc-500">/{account.dailySendLimit}</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                                        </div>
                                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{account.openRate?.toFixed(0) || 0}%</p>
                                        <p className="text-[10px] text-zinc-500">Open</p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <Mail className="w-3 h-3 text-violet-500" />
                                        </div>
                                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{account.replyRate?.toFixed(0) || 0}%</p>
                                        <p className="text-[10px] text-zinc-500">Reply</p>
                                    </div>
                                </div>

                                {/* Warmup Progress */}
                                {account.status === "warming_up" && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-zinc-500">Warmup Progress</span>
                                            <span className="text-zinc-700 dark:text-zinc-300">{account.warmupCurrentDaily}/{account.warmupTargetDaily}/day</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                                style={{ width: `${(account.warmupCurrentDaily / account.warmupTargetDaily) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Warmup Toggle */}
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Flame className="w-4 h-4 text-amber-500" />
                                        <span className="text-zinc-500">Warmup</span>
                                    </div>
                                    {account.isIntegration ? (
                                        <span className="text-xs text-zinc-400">N/A</span>
                                    ) : (
                                        <button
                                            onClick={() => handleToggleWarmup(account._id, !account.warmupEnabled)}
                                            className={cn(
                                                "relative w-9 h-5 rounded-full transition-colors",
                                                account.warmupEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                                                account.warmupEnabled ? "left-[18px]" : "left-0.5"
                                            )} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Account Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Add Email Account</h2>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    <XMarkIcon className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            {/* Account Type Tabs */}
                            <div className="flex gap-2 p-5 pb-0">
                                <button
                                    onClick={() => setAddType("smtp")}
                                    className={cn(
                                        "flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                        addType === "smtp" ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                    )}
                                >
                                    SMTP / IMAP
                                </button>
                                <button
                                    onClick={() => setAddType("gmail")}
                                    className={cn(
                                        "flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                        addType === "gmail" ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                    )}
                                >
                                    Gmail OAuth
                                </button>
                            </div>

                            {addType === "smtp" ? (
                                <form onSubmit={handleConnectSMTP} className="p-5 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            value={smtpForm.email}
                                            onChange={(e) => setSmtpForm({ ...smtpForm, email: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="you@company.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">SMTP Host</label>
                                            <input
                                                type="text"
                                                value={smtpForm.smtpHost}
                                                onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })}
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="smtp.example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">SMTP Port</label>
                                            <input
                                                type="number"
                                                value={smtpForm.smtpPort}
                                                onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: e.target.value })}
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="587"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">SMTP Username</label>
                                        <input
                                            type="text"
                                            value={smtpForm.smtpUser}
                                            onChange={(e) => setSmtpForm({ ...smtpForm, smtpUser: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="your-username"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">SMTP Password</label>
                                        <input
                                            type="password"
                                            value={smtpForm.smtpPassword}
                                            onChange={(e) => setSmtpForm({ ...smtpForm, smtpPassword: e.target.value })}
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-5 text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                                            <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Connect Gmail Account</h3>
                                    <p className="text-zinc-500 mb-6 text-sm">Connect your Gmail account using Google OAuth</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowAddModal(false)}
                                            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
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
                                            className="flex-1 px-4 py-2 rounded-full bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors inline-flex items-center justify-center gap-2"
                                        >
                                            Connect with Google
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setAccountToDelete(null);
                }}
                onConfirm={handleDisconnect}
                title="Disconnect Email Account"
                message="Are you sure you want to disconnect this email account? This cannot be undone."
                confirmText="Disconnect"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}
