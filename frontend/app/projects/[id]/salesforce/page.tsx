"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Settings, Database, Activity } from "lucide-react";
import FieldMappingEditor from "@/components/salesforce/FieldMappingEditor";

interface SalesforceIntegration {
  connected: boolean;
  data?: {
    organizationName: string;
    userEmail: string;
    syncStatus: string;
    lastSyncAt: string;
    nextSyncAt: string;
    stats: {
      totalSynced: number;
      lastSyncDuration?: number;
      syncErrors: number;
    };
    syncDirection: string;
    syncFrequency: number;
  };
}

interface SyncLog {
  _id: string;
  operation: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  summary: {
    totalRecords: number;
    successful: number;
    errors: number;
    conflicts: number;
  };
}

export default function SalesforcePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [integration, setIntegration] = useState<SalesforceIntegration>({ connected: false });
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Settings state
  const [syncDirection, setSyncDirection] = useState("bidirectional");
  const [syncFrequency, setSyncFrequency] = useState(15);
  const [syncContacts, setSyncContacts] = useState(true);
  const [syncAccounts, setSyncAccounts] = useState(true);
  const [syncOpportunities, setSyncOpportunities] = useState(true);

  useEffect(() => {
    fetchIntegrationStatus();
    fetchSyncLogs();
  }, [workspaceId]);

  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/salesforce/status`, {
        credentials: "include",
      });
      const result = await response.json();
      setIntegration(result);

      if (result.connected && result.data) {
        setSyncDirection(result.data.syncDirection);
        setSyncFrequency(result.data.syncFrequency);
      }
    } catch (error) {
      console.error("Error fetching Salesforce status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/salesforce/sync-logs`, {
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setSyncLogs(result.data);
      }
    } catch (error) {
      console.error("Error fetching sync logs:", error);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/salesforce/auth`, {
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        window.location.href = result.authUrl;
      }
    } catch (error) {
      console.error("Error initiating Salesforce OAuth:", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/salesforce/sync`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setTimeout(() => {
          fetchIntegrationStatus();
          fetchSyncLogs();
          setSyncing(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error triggering sync:", error);
      setSyncing(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/salesforce/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          syncDirection,
          syncFrequency,
          syncContacts,
          syncAccounts,
          syncOpportunities,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchIntegrationStatus();
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Salesforce?")) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/salesforce/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setIntegration({ connected: false });
      }
    } catch (error) {
      console.error("Error disconnecting Salesforce:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!integration.connected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="glass-card p-8 animate-fadeInUp">
          <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
            {/* Icon */}
            <div className="w-16 h-16 flex items-center justify-center">
              <Database className="h-16 w-16 text-foreground" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Connect to Salesforce</h2>
              <p className="text-muted-foreground">
                Sync your CRM data with Salesforce automatically. Keep contacts, companies, and deals in sync across both platforms.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleConnect}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 hover:scale-105 transition-all duration-300"
            >
              Connect Salesforce
            </button>

            {/* Info Alert */}
            <div className="w-full pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">What gets synced:</strong> Contacts ↔ Contacts, Companies ↔ Accounts, Opportunities ↔ Opportunities
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salesforce Integration</h1>
          <p className="text-sm text-gray-600">Connected to {integration.data?.organizationName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Now
          </Button>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="field-mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="sync-logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sync Status Card */}
            <div className="minimal-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Sync Status</p>
              <div className="flex items-center gap-2">
                {integration.data?.syncStatus === "active" ? (
                  <>
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-lg font-bold text-foreground">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    <span className="text-lg font-bold text-foreground">Error</span>
                  </>
                )}
              </div>
            </div>

            {/* Total Synced Card */}
            <div className="minimal-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Total Synced</p>
              <div className="text-3xl font-bold text-foreground">{integration.data?.stats.totalSynced || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">records</p>
            </div>

            {/* Next Sync Card */}
            <div className="minimal-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Next Sync</p>
              <div className="text-sm text-foreground">
                {integration.data?.nextSyncAt
                  ? new Date(integration.data.nextSyncAt).toLocaleString()
                  : "Not scheduled"}
              </div>
            </div>
          </div>

          {/* Sync Information */}
          <div className="minimal-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sync Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Organization</span>
                <span className="text-sm font-medium text-foreground">{integration.data?.organizationName}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">User Email</span>
                <span className="text-sm font-medium text-foreground">{integration.data?.userEmail}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm font-medium text-foreground">
                  {integration.data?.lastSyncAt
                    ? new Date(integration.data.lastSyncAt).toLocaleString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">Sync Direction</span>
                <span className="text-sm font-medium text-foreground border border-border px-2 py-0.5 rounded">
                  {integration.data?.syncDirection?.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sync Frequency</span>
                <span className="text-sm font-medium text-foreground">Every {integration.data?.syncFrequency} minutes</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>Configure how data syncs between your CRM and Salesforce</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Sync Direction</Label>
                <Select value={syncDirection} onValueChange={setSyncDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">Bidirectional (Both Ways)</SelectItem>
                    <SelectItem value="crm_to_salesforce">CRM to Salesforce Only</SelectItem>
                    <SelectItem value="salesforce_to_crm">Salesforce to CRM Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sync Frequency (minutes)</Label>
                <Select value={syncFrequency.toString()} onValueChange={(v) => setSyncFrequency(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Sync Objects</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-contacts" className="font-normal">
                      Sync Contacts
                    </Label>
                    <Switch id="sync-contacts" checked={syncContacts} onCheckedChange={setSyncContacts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-accounts" className="font-normal">
                      Sync Accounts (Companies)
                    </Label>
                    <Switch id="sync-accounts" checked={syncAccounts} onCheckedChange={setSyncAccounts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-opportunities" className="font-normal">
                      Sync Opportunities
                    </Label>
                    <Switch
                      id="sync-opportunities"
                      checked={syncOpportunities}
                      onCheckedChange={setSyncOpportunities}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleUpdateSettings}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field-mappings" className="space-y-4">
          <FieldMappingEditor workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="sync-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Recent sync operations and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncLogs.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-8">No sync logs yet</p>
                ) : (
                  syncLogs.map((log) => (
                    <div key={log._id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span className="font-medium">{log.operation.replace("_", " ")}</span>
                          <Badge variant={log.status === "completed" ? "default" : "destructive"}>{log.status}</Badge>
                        </div>
                        <span className="text-xs text-gray-600">{new Date(log.startedAt).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total:</span> {log.summary.totalRecords}
                        </div>
                        <div>
                          <span className="text-gray-600">Success:</span>{" "}
                          <span className="text-green-600">{log.summary.successful}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Errors:</span>{" "}
                          <span className="text-red-600">{log.summary.errors}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span> {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "N/A"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
