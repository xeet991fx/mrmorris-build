"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { getIntegrationMeta } from "@/lib/workflow/integrations";
import axios from "@/lib/axios";

// ============================================
// TYPES
// ============================================

interface OAuthConnectButtonProps {
    integrationType: "google_sheets" | "notion" | "slack";
    workspaceId: string;
    action: string;
    credentialId?: string;
    onCredentialCreated: (credentialId: string) => void;
}

// ============================================
// OAUTH CONNECT BUTTON COMPONENT
// ============================================

export default function OAuthConnectButton({
    integrationType,
    workspaceId,
    action,
    credentialId,
    onCredentialCreated,
}: OAuthConnectButtonProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authWindow, setAuthWindow] = useState<Window | null>(null);

    const integrationMeta = getIntegrationMeta(`integration_${integrationType}`);
    const Icon = integrationMeta?.icon;

    const getOAuthScopes = (type: string, action: string): string => {
        // Define scopes based on integration type and action
        switch (type) {
            case "google_sheets":
                return "Google Sheets (read and write)";
            case "notion":
                if (action === "query_database" || action === "retrieve_page") {
                    return "Notion (read access)";
                }
                return "Notion (read and write access)";
            case "slack":
                if (action === "post_message") {
                    return "Slack (send messages, view channels)";
                }
                return "Slack (full access)";
            default:
                return "Required permissions";
        }
    };

    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            // Request OAuth authorization URL
            const response = await axios.get(
                `/integrations/${integrationType}/oauth/authorize`,
                {
                    params: {
                        workspaceId,
                        action,
                    },
                }
            );

            const { url } = response.data;

            // Open OAuth popup
            const width = 600;
            const height = 800;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                url,
                "OAuth Authorization",
                `width=${width},height=${height},left=${left},top=${top}`
            );

            setAuthWindow(popup);

            // Poll for popup closure and credential creation
            const pollInterval = setInterval(async () => {
                if (!popup || popup.closed) {
                    clearInterval(pollInterval);
                    setIsConnecting(false);
                    setAuthWindow(null);

                    // Check if credential was created
                    try {
                        const credResponse = await axios.get(
                            `/workspaces/${workspaceId}/credentials`,
                            {
                                params: { type: integrationType },
                            }
                        );

                        const credentials = credResponse.data.credentials || [];

                        // Get the most recently created credential
                        if (credentials.length > 0) {
                            const latestCredential = credentials.sort(
                                (a: any, b: any) =>
                                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            )[0];

                            onCredentialCreated(latestCredential._id);
                        }
                    } catch (error) {
                        console.error("Error fetching credentials after OAuth:", error);
                        setError("Connected successfully, but failed to retrieve credential. Please refresh.");
                    }
                }
            }, 500);

            // Cleanup after 5 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                if (popup && !popup.closed) {
                    popup.close();
                }
                setIsConnecting(false);
                setAuthWindow(null);
            }, 300000);
        } catch (error) {
            console.error("OAuth error:", error);
            setError(error instanceof Error ? error.message : "Failed to connect");
            setIsConnecting(false);
        }
    };

    if (credentialId) {
        return (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                Connected to {integrationMeta?.name}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                You can now configure the integration settings below
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-dashed">
            <CardHeader>
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${integrationMeta?.bgColor || "bg-gray-600"
                                }`}
                        >
                            <Icon className="w-7 h-7 text-white" />
                        </div>
                    )}
                    <div className="flex-1">
                        <CardTitle className="text-lg">Connect {integrationMeta?.name}</CardTitle>
                        <CardDescription className="mt-1">
                            Authorize access to perform: <strong>{action}</strong>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">This integration will request:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{getOAuthScopes(integrationType, action)}</span>
                        </li>
                    </ul>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full"
                    size="lg"
                >
                    {isConnecting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Waiting for authorization...
                        </>
                    ) : (
                        <>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Connect to {integrationMeta?.name}
                        </>
                    )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                    A new window will open for authorization. Please complete the sign-in process.
                </p>
            </CardContent>
        </Card>
    );
}
