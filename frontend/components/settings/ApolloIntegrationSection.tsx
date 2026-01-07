"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getApolloSettings, saveApolloSettings } from "@/lib/api/apolloSettings";

interface ApolloIntegrationSectionProps {
  workspaceId: string;
}

export default function ApolloIntegrationSection({
  workspaceId,
}: ApolloIntegrationSectionProps) {
  const router = useRouter();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [autoEnrichNew, setAutoEnrichNew] = useState(false);
  const [autoEnrichMissing, setAutoEnrichMissing] = useState(false);
  const [autoVerifyEmails, setAutoVerifyEmails] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("1000");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await getApolloSettings(workspaceId);
      if (result.success && result.data) {
        setApiKey(result.data.apiKey || "");
        setAutoEnrichNew(result.data.autoEnrichNew || false);
        setAutoEnrichMissing(result.data.autoEnrichMissing || false);
        setAutoVerifyEmails(result.data.autoVerifyEmails || false);
        setAlertThreshold(result.data.alertThreshold?.toString() || "1000");
        setNotificationEmail(result.data.notificationEmail || "");
        if (result.data.apiKey) {
          setConnectionStatus(true);
        }
      }
    } catch (error) {
      // Settings don't exist yet, that's okay
      console.log("No Apollo settings found, using defaults");
    } finally {
      setIsLoading(false);
    }
  };

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
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      const result = await saveApolloSettings(workspaceId, {
        apiKey,
        autoEnrichNew,
        autoEnrichMissing,
        autoVerifyEmails,
        alertThreshold: parseInt(alertThreshold),
        notificationEmail,
      });

      if (result.success) {
        toast.success("Settings saved successfully!");
        setConnectionStatus(true);
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <ArrowPathIcon className="w-6 h-6 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Connection Card */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          API Connection
        </h3>
        <div className="premium-card p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Apollo.io API key"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              {connectionStatus === true && (
                <>
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-sm font-medium text-foreground">
                    Connected
                  </span>
                </>
              )}
              {connectionStatus === false && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Not Connected
                  </span>
                </>
              )}
              {connectionStatus === null && (
                <span className="text-sm text-muted-foreground">Not tested</span>
              )}
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection || !apiKey}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection && (
                <ArrowPathIcon className="w-4 h-4 inline mr-2 animate-spin" />
              )}
              {isTestingConnection ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Enrichment Settings */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Auto-Enrichment
        </h3>
        <div className="rounded-lg border border-border bg-background p-4">
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoEnrichNew ? "bg-primary" : "bg-muted"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoEnrichNew ? "translate-x-6" : "translate-x-1"
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoEnrichMissing ? "bg-primary" : "bg-muted"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoEnrichMissing ? "translate-x-6" : "translate-x-1"
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoVerifyEmails ? "bg-primary" : "bg-muted"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoVerifyEmails ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Alerts */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Credit Alerts
        </h3>
        <div className="rounded-lg border border-border bg-background p-4">
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
      </div>

      {/* Quick Access Links */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Quick Access
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => router.push(`/projects/${workspaceId}/apollo/search`)}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-card transition-colors text-left"
          >
            <div>
              <div className="text-sm font-medium text-foreground">
                Search Contacts
              </div>
              <div className="text-xs text-muted-foreground">Find new leads</div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => router.push(`/projects/${workspaceId}/apollo/usage`)}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-card transition-colors text-left"
          >
            <div>
              <div className="text-sm font-medium text-foreground">
                Credit Usage
              </div>
              <div className="text-xs text-muted-foreground">View analytics</div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={() =>
              router.push(`/projects/${workspaceId}/contacts/bulk-enrich`)
            }
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

      {/* Save Button */}
      <div>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving || !apiKey}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
