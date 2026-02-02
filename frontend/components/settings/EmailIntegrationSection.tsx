"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  EnvelopeIcon,
  ArrowPathIcon,
  TrashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  getGmailConnectUrl,
  getEmailIntegrations,
  disconnectEmailIntegration,
  syncEmails,
  syncContacts,
  EmailIntegration,
} from "@/lib/api/emailIntegration";
import toast from "react-hot-toast";

interface EmailIntegrationSectionProps {
  workspaceId: string;
}

export default function EmailIntegrationSection({
  workspaceId,
}: EmailIntegrationSectionProps) {
  const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingContacts, setSyncingContacts] = useState<string | null>(null);
  const [autoExtract, setAutoExtract] = useState(false);

  useEffect(() => {
    loadIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadIntegrations = async () => {
    setLoading(true);
    const result = await getEmailIntegrations(workspaceId);
    if (result.success) {
      setIntegrations(result.data.integrations);

      // Story 5.2 Task 9.5: Show toast for expired/expiring integrations on load
      const integrationList = result.data.integrations as EmailIntegration[];
      const expiredIntegrations = integrationList.filter(
        (i) => i.status === 'Expired' || i.status === 'Error' || i.status === 'Revoked'
      );
      const expiringIntegrations = integrationList.filter((i) => {
        if (i.tokenExpiry) {
          const daysLeft = Math.ceil((new Date(i.tokenExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          return daysLeft > 0 && daysLeft <= 7 && i.status === 'Connected';
        }
        return false;
      });

      if (expiredIntegrations.length > 0) {
        toast.error(
          `⚠️ ${expiredIntegrations.length} integration${expiredIntegrations.length > 1 ? 's' : ''} expired. Agents may be paused.`,
          { duration: 6000 }
        );
      } else if (expiringIntegrations.length > 0) {
        toast(
          `🔔 ${expiringIntegrations.length} integration${expiringIntegrations.length > 1 ? 's' : ''} expiring soon.`,
          { duration: 5000, icon: '⏰' }
        );
      }
    }
    setLoading(false);
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    try {
      // Story 5.1: Use new OAuth popup pattern
      const result = await getGmailConnectUrl(workspaceId);
      if (result.success && result.data?.authUrl) {
        // Open OAuth popup window
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
          result.data.authUrl,
          'gmail-oauth-popup',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        // Poll for popup close (OAuth callback auto-closes popup)
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setConnecting(false);
            // Refresh integrations list after OAuth completion
            loadIntegrations();
            toast.success("Gmail connection successful!");
          }
        }, 500);
      } else {
        toast.error(result.error || "Failed to connect Gmail");
        setConnecting(false);
      }
    } catch (error) {
      toast.error("Failed to connect Gmail");
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
        const {
          activitiesCreated,
          companiesCreated,
          companiesUpdated,
          contactsCreated,
          contactsUpdated,
          signaturesParsed
        } = result.data;
        const stats: string[] = [`Activities: ${activitiesCreated || 0}`];

        if (companiesCreated || companiesUpdated) {
          const companyStat = [];
          if (companiesCreated) companyStat.push(`${companiesCreated} created`);
          if (companiesUpdated) companyStat.push(`${companiesUpdated} updated`);
          stats.push(`Companies: ${companyStat.join(', ')}`);
        }

        if (contactsCreated || contactsUpdated) {
          stats.push(`Contacts: ${contactsCreated || 0} created, ${contactsUpdated || 0} updated`);
        }

        if (signaturesParsed) {
          stats.push(`Signatures: ${signaturesParsed} parsed`);
        }

        toast.success(
          `Email sync complete! ${stats.join(' | ')}`,
          { duration: 6000 }
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

  const handleSyncContacts = async (integrationId: string) => {
    setSyncingContacts(integrationId);
    try {
      const result = await syncContacts(integrationId, autoExtract);
      if (result.success) {
        const { created, updated, skipped } = result.data;
        toast.success(
          `Contacts synced! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`
        );
        loadIntegrations();
      } else {
        if (result.error?.includes("Insufficient permissions") || result.error?.includes("insufficient authentication")) {
          toast.error(
            "Please reconnect Gmail to grant contact permissions",
            { duration: 5000 }
          );
        } else {
          toast.error(result.error || "Contact sync failed");
        }
      }
    } catch (error) {
      toast.error("Contact sync failed");
    } finally {
      setSyncingContacts(null);
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

  // Story 5.2: Compute expiration status with days warning
  const computeExpirationStatus = (integration: EmailIntegration) => {
    if (integration.status === 'Expired' || integration.status === 'Revoked') {
      return { status: 'expired' as const, daysLeft: 0 };
    }
    if (integration.status === 'Error') {
      return { status: 'error' as const, daysLeft: 0 };
    }

    // Check token expiration date
    if (integration.tokenExpiry) {
      const expiryDate = new Date(integration.tokenExpiry);
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysLeft <= 0) {
        return { status: 'expired' as const, daysLeft: 0 };
      }
      if (daysLeft <= 7) {
        return { status: 'expiring' as const, daysLeft };
      }
    }

    return { status: 'connected' as const, daysLeft: 0 };
  };

  return (
    <div className="space-y-6">
      {/* New Feature Banner */}
      {integrations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/5"
        >
          <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-400 mb-1">
              Automatic Contact Extraction
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Contacts are now extracted from emails automatically! Use "Sync Contacts" to import your Gmail contacts too.
            </p>
          </div>
        </motion.div>
      )}

      {/* Connect Email Account Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Connect Email Account
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Gmail Card */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConnectGmail}
            disabled={connecting}
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 group"
          >
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
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
              <div className="text-sm font-medium text-foreground">
                Connect Gmail
              </div>
              <div className="text-xs text-muted-foreground">
                Link your Google account
              </div>
            </div>
            {connecting && (
              <ArrowPathIcon className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </motion.button>

          {/* Outlook Card - Coming Soon */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-background/40 to-background/20 backdrop-blur-sm opacity-50 cursor-not-allowed relative">
            <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
              Coming Soon
            </span>
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm">
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
              <div className="text-sm font-medium text-muted-foreground">
                Connect Outlook
              </div>
              <div className="text-xs text-muted-foreground">
                Microsoft 365 integration
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Connected Accounts
          </h3>

          {/* Auto-extract toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoExtract}
              onChange={(e) => setAutoExtract(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-xs text-muted-foreground">
              Auto-extract from emails
            </span>
            <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 bg-muted/50 rounded-full">
              Beta
            </span>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 rounded-xl bg-gradient-to-br from-background/80 to-background/40">
            <div className="flex flex-col items-center gap-2">
              <ArrowPathIcon className="w-6 h-6 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Loading accounts...</p>
            </div>
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-gradient-to-br from-background/80 to-background/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-4">
              <EnvelopeIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              No accounts connected
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
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
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
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
                        {/* Story 5.2: Enhanced status badges with expiration warnings */}
                        {(() => {
                          const { status, daysLeft } = computeExpirationStatus(integration);
                          if (status === 'connected') {
                            return (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-medium text-emerald-400">
                                <CheckCircleIcon className="w-3 h-3" />
                                Connected
                              </span>
                            );
                          } else if (status === 'expiring') {
                            const expiryDate = integration.tokenExpiry
                              ? new Date(integration.tokenExpiry).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                              : 'soon';
                            return (
                              <div className="relative group">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-medium text-amber-400 animate-pulse cursor-help">
                                  <ExclamationCircleIcon className="w-3 h-3" />
                                  Expires in {daysLeft} day{daysLeft > 1 ? 's' : ''}
                                </span>
                                {/* Story 5.2 Task 8.2: Tooltip with exact expiration date */}
                                <div className="absolute z-50 bottom-full left-0 mb-2 hidden group-hover:block">
                                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
                                    <p className="text-xs text-foreground font-medium mb-1">Token Expires</p>
                                    <p className="text-xs text-muted-foreground mb-2">{expiryDate}</p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConnectGmail();
                                      }}
                                      className="w-full px-2 py-1.5 text-[10px] font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                                    >
                                      Reconnect Now
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (status === 'expired') {
                            return (
                              <div className="relative group">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-[10px] font-medium text-red-400 cursor-help">
                                  <ExclamationCircleIcon className="w-3 h-3" />
                                  Expired - Reconnect
                                </span>
                                {/* Story 5.2 Task 9.4: Tooltip showing affected agents info */}
                                <div className="absolute z-50 bottom-full left-0 mb-2 hidden group-hover:block">
                                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                                    <p className="text-xs text-red-400 font-medium mb-1">⚠️ Integration Expired</p>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Agents using this integration have been automatically paused. Check your notifications for details.
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConnectGmail();
                                      }}
                                      className="w-full px-2 py-1.5 text-[10px] font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                    >
                                      Reconnect Now
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-[10px] font-medium text-red-400">
                                <ExclamationCircleIcon className="w-3 h-3" />
                                Error - Reconnect
                              </span>
                            );
                          }
                        })()}
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
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSync(integration._id)}
                      disabled={syncing === integration._id || syncingContacts === integration._id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-medium rounded-lg hover:shadow-md hover:shadow-primary/20 transition-all duration-300 disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={`w-3.5 h-3.5 ${syncing === integration._id ? "animate-spin" : ""
                          }`}
                      />
                      {syncing === integration._id ? "Syncing..." : "Sync Emails"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSyncContacts(integration._id)}
                      disabled={syncingContacts === integration._id || syncing === integration._id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-medium rounded-lg hover:shadow-md hover:shadow-emerald-500/20 transition-all duration-300 disabled:opacity-50"
                      title="Sync contacts from Gmail"
                    >
                      <UserGroupIcon
                        className={`w-3.5 h-3.5 ${syncingContacts === integration._id ? "animate-spin" : ""
                          }`}
                      />
                      {syncingContacts === integration._id ? "Syncing..." : "Sync Contacts"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDisconnect(integration._id)}
                      className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                      title="Disconnect"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </motion.button>
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
