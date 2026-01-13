"use client";

/**
 * Google Sheets Form Integration Component
 *
 * Allows users to configure and manage Google Sheets sync for their forms.
 */

import { useState, useEffect } from "react";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    CloudArrowUpIcon,
    TableCellsIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface GoogleSheetsIntegrationConfig {
    enabled: boolean;
    spreadsheetId: string;
    sheetName: string;
    syncMode: "realtime" | "batch";
    credentialId: string;
    lastSyncAt?: string;
    syncStats?: {
        totalSynced: number;
        failedSyncs: number;
    };
}

interface Credential {
    _id: string;
    name: string;
    type: string;
    isValid: boolean;
}

interface Spreadsheet {
    id: string;
    name: string;
}

interface GoogleSheetsFormIntegrationProps {
    workspaceId: string;
    formId: string;
    config?: GoogleSheetsIntegrationConfig;
    onConfigChange: (config: GoogleSheetsIntegrationConfig) => void;
}

export default function GoogleSheetsFormIntegration({
    workspaceId,
    formId,
    config,
    onConfigChange,
}: GoogleSheetsFormIntegrationProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
    const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{
        enabled: boolean;
        lastSync?: Date;
        totalSynced: number;
        pendingSync: number;
        failedSyncs: number;
    } | null>(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

    // Initialize local state from config
    const [localConfig, setLocalConfig] = useState<GoogleSheetsIntegrationConfig>({
        enabled: config?.enabled || false,
        spreadsheetId: config?.spreadsheetId || "",
        sheetName: config?.sheetName || "Form Submissions",
        syncMode: config?.syncMode || "realtime",
        credentialId: config?.credentialId || "",
        lastSyncAt: config?.lastSyncAt,
        syncStats: config?.syncStats,
    });

    // Fetch credentials on mount
    useEffect(() => {
        fetchCredentials();
    }, [workspaceId]);

    // Fetch spreadsheets when credential changes
    useEffect(() => {
        if (localConfig.credentialId) {
            fetchSpreadsheets(localConfig.credentialId);
        }
    }, [localConfig.credentialId]);

    // Fetch sync status when form changes
    useEffect(() => {
        if (formId && formId !== "new") {
            fetchSyncStatus();
        }
    }, [formId]);

    // Update parent when local config changes
    useEffect(() => {
        onConfigChange(localConfig);
    }, [localConfig]);

    const fetchCredentials = async () => {
        try {
            const response = await fetch(
                `${backendUrl}/api/workspaces/${workspaceId}/credentials?type=google_sheets`,
                { credentials: "include" }
            );
            const data = await response.json();
            if (data.success) {
                setCredentials(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching credentials:", error);
        }
    };

    const fetchSpreadsheets = async (credentialId: string) => {
        setLoadingSpreadsheets(true);
        try {
            const response = await fetch(
                `${backendUrl}/api/integrations/google_sheets/spreadsheets?credentialId=${credentialId}`,
                { credentials: "include" }
            );
            const data = await response.json();
            if (data.success) {
                setSpreadsheets(data.spreadsheets || []);
            }
        } catch (error) {
            console.error("Error fetching spreadsheets:", error);
            toast.error("Failed to load spreadsheets");
        } finally {
            setLoadingSpreadsheets(false);
        }
    };

    const fetchSyncStatus = async () => {
        try {
            const response = await fetch(
                `${backendUrl}/api/integrations/google_sheets/forms/${formId}/sync-status`,
                { credentials: "include" }
            );
            const data = await response.json();
            if (data.success) {
                setSyncStatus({
                    enabled: data.enabled,
                    lastSync: data.lastSync ? new Date(data.lastSync) : undefined,
                    totalSynced: data.totalSynced || 0,
                    pendingSync: data.pendingSync || 0,
                    failedSyncs: data.failedSyncs || 0,
                });
            }
        } catch (error) {
            console.error("Error fetching sync status:", error);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            const response = await fetch(
                `${backendUrl}/api/integrations/google_sheets/oauth/authorize?workspaceId=${workspaceId}`,
                { credentials: "include" }
            );
            const data = await response.json();

            if (data.url) {
                // Open OAuth popup
                const popup = window.open(data.url, "Google OAuth", "width=600,height=700");

                // Poll for popup close
                const checkPopup = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkPopup);
                        // Refresh credentials
                        fetchCredentials();
                        toast.success("Google account connected!");
                    }
                }, 500);
            }
        } catch (error) {
            console.error("Error connecting Google:", error);
            toast.error("Failed to connect Google account");
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch(
                `${backendUrl}/api/integrations/google_sheets/forms/${formId}/sync`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );
            const data = await response.json();

            if (data.success) {
                toast.success(`Synced ${data.rowsAdded || 0} rows to Google Sheets`);
                fetchSyncStatus();
            } else {
                toast.error(data.error || "Sync failed");
            }
        } catch (error) {
            console.error("Error syncing:", error);
            toast.error("Failed to sync to Google Sheets");
        } finally {
            setIsSyncing(false);
        }
    };

    const updateConfig = (updates: Partial<GoogleSheetsIntegrationConfig>) => {
        setLocalConfig((prev) => ({ ...prev, ...updates }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                        <TableCellsIcon className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">Google Sheets Integration</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Automatically sync form submissions to a Google Spreadsheet in real-time or batch mode.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={localConfig.enabled}
                            onChange={(e) => updateConfig({ enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                    </label>
                </div>
            </div>

            {localConfig.enabled && (
                <>
                    {/* Google Account Connection */}
                    <div className="p-6 bg-card border border-border rounded-xl space-y-4">
                        <h4 className="font-semibold text-foreground">Google Account</h4>

                        {credentials.length === 0 ? (
                            <div className="text-center py-6">
                                <CloudArrowUpIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground mb-4">
                                    Connect your Google account to sync submissions
                                </p>
                                <button
                                    onClick={handleConnectGoogle}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2 mx-auto"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Connect Google Account
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Select Google Account
                                    </label>
                                    <select
                                        value={localConfig.credentialId}
                                        onChange={(e) => updateConfig({ credentialId: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    >
                                        <option value="">Select an account...</option>
                                        {credentials.map((cred) => (
                                            <option key={cred._id} value={cred._id}>
                                                {cred.name} {!cred.isValid && "(⚠️ Reconnect needed)"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleConnectGoogle}
                                    className="text-sm text-primary hover:underline"
                                >
                                    + Connect another account
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Spreadsheet Selection */}
                    {localConfig.credentialId && (
                        <div className="p-6 bg-card border border-border rounded-xl space-y-4">
                            <h4 className="font-semibold text-foreground">Spreadsheet Settings</h4>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Select Spreadsheet
                                </label>
                                {loadingSpreadsheets ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Loading spreadsheets...
                                    </div>
                                ) : (
                                    <select
                                        value={localConfig.spreadsheetId}
                                        onChange={(e) => updateConfig({ spreadsheetId: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    >
                                        <option value="">Select a spreadsheet...</option>
                                        {spreadsheets.map((sheet) => (
                                            <option key={sheet.id} value={sheet.id}>
                                                {sheet.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Sheet Tab Name
                                </label>
                                <input
                                    type="text"
                                    value={localConfig.sheetName}
                                    onChange={(e) => updateConfig({ sheetName: e.target.value })}
                                    placeholder="Form Submissions"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Will be created automatically if it doesn't exist
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Sync Mode
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => updateConfig({ syncMode: "realtime" })}
                                        className={cn(
                                            "p-4 rounded-lg border-2 transition-all text-left",
                                            localConfig.syncMode === "realtime"
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className={cn(
                                                    "w-3 h-3 rounded-full",
                                                    localConfig.syncMode === "realtime"
                                                        ? "bg-green-500"
                                                        : "bg-muted-foreground/30"
                                                )}
                                            />
                                            <span className="font-medium text-foreground">Real-time</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Sync immediately on each submission
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateConfig({ syncMode: "batch" })}
                                        className={cn(
                                            "p-4 rounded-lg border-2 transition-all text-left",
                                            localConfig.syncMode === "batch"
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className={cn(
                                                    "w-3 h-3 rounded-full",
                                                    localConfig.syncMode === "batch"
                                                        ? "bg-blue-500"
                                                        : "bg-muted-foreground/30"
                                                )}
                                            />
                                            <span className="font-medium text-foreground">Batch</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Sync every hour in batches
                                        </p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sync Status */}
                    {syncStatus && formId !== "new" && (
                        <div className="p-6 bg-card border border-border rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-foreground">Sync Status</h4>
                                <button
                                    onClick={handleManualSync}
                                    disabled={isSyncing || !localConfig.spreadsheetId}
                                    className={cn(
                                        "px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors",
                                        localConfig.spreadsheetId
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    <ArrowPathIcon className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                    {isSyncing ? "Syncing..." : "Sync Now"}
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold text-foreground">
                                        {syncStatus.totalSynced}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Synced</p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold text-yellow-500">
                                        {syncStatus.pendingSync}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Pending Sync</p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold text-red-500">
                                        {syncStatus.failedSyncs}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Failed</p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm font-medium text-foreground">
                                        {syncStatus.lastSync
                                            ? new Date(syncStatus.lastSync).toLocaleString()
                                            : "Never"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Last Sync</p>
                                </div>
                            </div>

                            {syncStatus.failedSyncs > 0 && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                                    <p className="text-sm text-red-500">
                                        Some submissions failed to sync. Click "Sync Now" to retry.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Field Mapping Info */}
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Automatic Column Mapping
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    The spreadsheet will automatically create columns based on your form fields.
                                    Each submission creates a new row with: Submission Date, Contact ID, and
                                    all form field values.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
