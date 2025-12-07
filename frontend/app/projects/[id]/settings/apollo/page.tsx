"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function ApolloSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [autoEnrichNew, setAutoEnrichNew] = useState(false);
  const [autoEnrichMissing, setAutoEnrichMissing] = useState(false);
  const [autoVerifyEmails, setAutoVerifyEmails] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("1000");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error("Please enter an API key first");
      return;
    }

    setIsTestingConnection(true);
    try {
      // TODO: Call your backend API to test the connection
      // const response = await fetch(`/api/workspaces/${workspaceId}/apollo/test-connection`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      setConnectionStatus(true);
      toast.success("Apollo API connection successful!");
    } catch (error) {
      setConnectionStatus(false);
      toast.error("Apollo API connection failed. Please check your API key.");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!apiKey) {
      toast.error("Please enter an API key");
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Call your backend API to save settings
      // const response = await fetch(`/api/workspaces/${workspaceId}/apollo/settings`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     apiKey,
      //     autoEnrichNew,
      //     autoEnrichMissing,
      //     autoVerifyEmails,
      //     alertThreshold: parseInt(alertThreshold),
      //     notificationEmail
      //   })
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
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
        <button
          onClick={() => router.push(`/projects/${workspaceId}/settings/email-integration`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Email Integration
        </button>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">Apollo.io</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Apollo.io Integration
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure B2B data enrichment and contact intelligence
            </p>
          </div>
        </div>
      </motion.div>

      {/* API Connection Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">API Connection</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Apollo.io API key"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://apollo.io/settings/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Apollo.io Settings
                </a>
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {connectionStatus === true && (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </>
                )}
                {connectionStatus === false && (
                  <>
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Not Connected</span>
                  </>
                )}
                {connectionStatus === null && (
                  <span className="text-sm text-muted-foreground">Not tested</span>
                )}
              </div>

              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !apiKey}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingConnection && (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                )}
                {isTestingConnection ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Auto-Enrichment Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Auto-Enrichment</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Auto-enrich new contacts
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically enrich contacts when they are created
                </p>
              </div>
              <button
                onClick={() => setAutoEnrichNew(!autoEnrichNew)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoEnrichNew ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoEnrichNew ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Auto-enrich contacts missing email
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enrich contacts that are missing email addresses
                </p>
              </div>
              <button
                onClick={() => setAutoEnrichMissing(!autoEnrichMissing)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoEnrichMissing ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoEnrichMissing ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Auto-verify emails before campaigns
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verify email addresses before sending email campaigns
                </p>
              </div>
              <button
                onClick={() => setAutoVerifyEmails(!autoVerifyEmails)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoVerifyEmails ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoVerifyEmails ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Credit Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Credit Alerts</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Alert when credits below
              </label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notification email
              </label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => router.push(`/projects/${workspaceId}/apollo/search`)}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-card transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-foreground">Search Contacts</div>
                <div className="text-xs text-muted-foreground">Find new leads</div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => router.push(`/projects/${workspaceId}/apollo/usage`)}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-card transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-foreground">Credit Usage</div>
                <div className="text-xs text-muted-foreground">View analytics</div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => router.push(`/projects/${workspaceId}/contacts/bulk-enrich`)}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-card transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-foreground">Bulk Enrich</div>
                <div className="text-xs text-muted-foreground">Enrich multiple</div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={handleSaveSettings}
          disabled={isSaving || !apiKey}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </motion.div>
    </div>
  );
}
