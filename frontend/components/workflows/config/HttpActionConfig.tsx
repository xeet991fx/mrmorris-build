"use client";

import { useState } from "react";
import { WorkflowStep } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobeAltIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

// ============================================
// HTTP ACTION CONFIG COMPONENT
// ============================================

interface HttpActionConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
}

export default function HttpActionConfig({ step, onUpdate }: HttpActionConfigProps) {
    const [activeTab, setActiveTab] = useState("request");
    const config = step.config || {};

    const handleConfigUpdate = (field: string, value: any) => {
        onUpdate({
            config: {
                ...config,
                [field]: value,
            },
        });
    };

    const addHeader = () => {
        const headers = config.headers || [];
        handleConfigUpdate("headers", [...headers, { key: "", value: "" }]);
    };

    const updateHeader = (index: number, field: string, value: string) => {
        const headers = [...(config.headers || [])];
        headers[index] = { ...headers[index], [field]: value };
        handleConfigUpdate("headers", headers);
    };

    const removeHeader = (index: number) => {
        const headers = config.headers.filter((_: any, i: number) => i !== index);
        handleConfigUpdate("headers", headers);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                <div className="w-10 h-10 rounded-md bg-gray-600 flex items-center justify-center text-white">
                    <GlobeAltIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">HTTP Request Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        Call external APIs with full authentication support
                    </p>
                </div>
            </div>

            {/* Configuration Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="auth">Authentication</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>

                {/* Request Tab */}
                <TabsContent value="request" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Request Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="method">Method</Label>
                                <Select
                                    value={config.method || "GET"}
                                    onValueChange={(value) => handleConfigUpdate("method", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="DELETE">DELETE</SelectItem>
                                        <SelectItem value="PATCH">PATCH</SelectItem>
                                        <SelectItem value="HEAD">HEAD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="url">URL</Label>
                                <Input
                                    id="url"
                                    placeholder="https://api.example.com/endpoint"
                                    value={config.url || ""}
                                    onChange={(e) => handleConfigUpdate("url", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {"{{placeholders}}"} for dynamic values
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Headers</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                                        <PlusIcon className="w-4 h-4 mr-1" />
                                        Add Header
                                    </Button>
                                </div>
                                {(config.headers || []).map((header: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            placeholder="Header Name"
                                            value={header.key}
                                            onChange={(e) => updateHeader(index, "key", e.target.value)}
                                        />
                                        <Input
                                            placeholder="Value"
                                            value={header.value}
                                            onChange={(e) => updateHeader(index, "value", e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeHeader(index)}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {(config.method === "POST" || config.method === "PUT" || config.method === "PATCH") && (
                                <div className="space-y-2">
                                    <Label htmlFor="body">Request Body</Label>
                                    <Textarea
                                        id="body"
                                        placeholder='{"key": "value"}'
                                        value={config.body?.content || ""}
                                        onChange={(e) =>
                                            handleConfigUpdate("body", {
                                                ...config.body,
                                                content: e.target.value,
                                            })
                                        }
                                        rows={6}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Authentication Tab */}
                <TabsContent value="auth" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Authentication</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Auth Type</Label>
                                <Select
                                    value={config.authentication?.type || "none"}
                                    onValueChange={(value) =>
                                        handleConfigUpdate("authentication", {
                                            ...config.authentication,
                                            type: value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Authentication</SelectItem>
                                        <SelectItem value="api_key">API Key</SelectItem>
                                        <SelectItem value="bearer">Bearer Token</SelectItem>
                                        <SelectItem value="basic">Basic Auth</SelectItem>
                                        <SelectItem value="oauth2">OAuth2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {config.authentication?.type === "api_key" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKey">API Key</Label>
                                        <Input
                                            id="apiKey"
                                            type="password"
                                            placeholder="Your API key"
                                            value={config.authentication?.apiKey || ""}
                                            onChange={(e) =>
                                                handleConfigUpdate("authentication", {
                                                    ...config.authentication,
                                                    apiKey: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKeyHeader">Header Name</Label>
                                        <Input
                                            id="apiKeyHeader"
                                            placeholder="X-API-Key"
                                            value={config.authentication?.headerName || "X-API-Key"}
                                            onChange={(e) =>
                                                handleConfigUpdate("authentication", {
                                                    ...config.authentication,
                                                    headerName: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            )}

                            {config.authentication?.type === "bearer" && (
                                <div className="space-y-2">
                                    <Label htmlFor="bearerToken">Bearer Token</Label>
                                    <Input
                                        id="bearerToken"
                                        type="password"
                                        placeholder="Your bearer token"
                                        value={config.authentication?.token || ""}
                                        onChange={(e) =>
                                            handleConfigUpdate("authentication", {
                                                ...config.authentication,
                                                token: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            )}

                            {config.authentication?.type === "basic" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            value={config.authentication?.username || ""}
                                            onChange={(e) =>
                                                handleConfigUpdate("authentication", {
                                                    ...config.authentication,
                                                    username: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={config.authentication?.password || ""}
                                            onChange={(e) =>
                                                handleConfigUpdate("authentication", {
                                                    ...config.authentication,
                                                    password: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Response Tab */}
                <TabsContent value="response" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Response Handling</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="extractPath">Extract Path (JSONPath)</Label>
                                <Input
                                    id="extractPath"
                                    placeholder="data.results[0]"
                                    value={config.responseHandling?.extractPath || ""}
                                    onChange={(e) =>
                                        handleConfigUpdate("responseHandling", {
                                            ...config.responseHandling,
                                            extractPath: e.target.value,
                                        })
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Extract specific data from the response
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="saveToVariable">Save to Variable</Label>
                                <Input
                                    id="saveToVariable"
                                    placeholder="apiResponse"
                                    value={config.responseHandling?.saveToVariable || ""}
                                    onChange={(e) =>
                                        handleConfigUpdate("responseHandling", {
                                            ...config.responseHandling,
                                            saveToVariable: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
