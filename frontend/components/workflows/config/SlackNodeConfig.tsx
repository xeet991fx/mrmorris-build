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
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

// ============================================
// TYPES
// ============================================

interface SlackNodeConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
}

type SlackAction =
    | "post_message"
    | "send_dm"
    | "create_channel"
    | "update_message"
    | "add_reaction"
    | "upload_file"
    | "set_topic"
    | "invite_to_channel";

const SLACK_ACTIONS = [
    { value: "post_message", label: "Post Message", description: "Post a message to a channel" },
    { value: "send_dm", label: "Send Direct Message", description: "Send a DM to a user" },
    { value: "create_channel", label: "Create Channel", description: "Create a new channel" },
    { value: "update_message", label: "Update Message", description: "Update an existing message" },
    { value: "add_reaction", label: "Add Reaction", description: "Add an emoji reaction" },
    { value: "upload_file", label: "Upload File", description: "Upload a file to a channel" },
    { value: "set_topic", label: "Set Channel Topic", description: "Update channel topic" },
    { value: "invite_to_channel", label: "Invite to Channel", description: "Invite users to a channel" },
];

// ============================================
// SLACK NODE CONFIG COMPONENT
// ============================================

export default function SlackNodeConfig({ step, onUpdate }: SlackNodeConfigProps) {
    const [activeTab, setActiveTab] = useState<string>("credentials");
    const config = step.config || {};

    const handleCredentialsUpdate = (field: string, value: string) => {
        onUpdate({
            config: {
                ...config,
                credentials: {
                    ...config.credentials,
                    [field]: value,
                },
            },
        });
    };

    const handleActionChange = (action: SlackAction) => {
        onUpdate({
            config: {
                ...config,
                action,
            },
        });
        setActiveTab("action-config");
    };

    const handleActionConfigUpdate = (field: string, value: any) => {
        const actionConfigKey = getActionConfigKey(config.action);
        onUpdate({
            config: {
                ...config,
                [actionConfigKey]: {
                    ...config[actionConfigKey],
                    [field]: value,
                },
            },
        });
    };

    const handleResponseUpdate = (field: string, value: string) => {
        onUpdate({
            config: {
                ...config,
                [field]: value,
            },
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="w-10 h-10 rounded-md bg-purple-600 flex items-center justify-center text-white">
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Slack Integration</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure Slack bot actions
                    </p>
                </div>
            </div>

            {/* Configuration Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="credentials">Credentials</TabsTrigger>
                    <TabsTrigger value="action">Action</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>

                {/* Credentials Tab */}
                <TabsContent value="credentials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Slack Bot Token</CardTitle>
                            <CardDescription>
                                Configure your Slack workspace credentials
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="botToken">Bot Token</Label>
                                <Input
                                    id="botToken"
                                    type="password"
                                    placeholder="xoxb-your-bot-token"
                                    value={config.credentials?.botToken || ""}
                                    onChange={(e) => handleCredentialsUpdate("botToken", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Get your bot token from{" "}
                                    <a
                                        href="https://api.slack.com/apps"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 hover:underline"
                                    >
                                        Slack API
                                    </a>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="workspaceId">Workspace ID (Optional)</Label>
                                <Input
                                    id="workspaceId"
                                    placeholder="T01234567"
                                    value={config.credentials?.workspaceId || ""}
                                    onChange={(e) => handleCredentialsUpdate("workspaceId", e.target.value)}
                                />
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={!config.credentials?.botToken}
                            >
                                Test Connection
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Action Selection Tab */}
                <TabsContent value="action" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Action</CardTitle>
                            <CardDescription>
                                Choose what action to perform in Slack
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Slack Action</Label>
                                <Select
                                    value={config.action || ""}
                                    onValueChange={(value) => handleActionChange(value as SlackAction)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SLACK_ACTIONS.map((action) => (
                                            <SelectItem key={action.value} value={action.value}>
                                                <div>
                                                    <div className="font-medium">{action.label}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {action.description}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Action-specific configuration */}
                            {config.action && (
                                <div className="pt-4 border-t">
                                    {renderActionConfig(config.action, config, handleActionConfigUpdate)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Response Handling Tab */}
                <TabsContent value="response" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Response Handling</CardTitle>
                            <CardDescription>
                                Configure how to handle Slack API responses
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="responseVariable">Store Response In Variable</Label>
                                <Input
                                    id="responseVariable"
                                    placeholder="slackResponse"
                                    value={config.responseVariable || ""}
                                    onChange={(e) => handleResponseUpdate("responseVariable", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Variable name to store the Slack API response (optional)
                                </p>
                            </div>

                            {config.responseVariable && (
                                <div className="p-3 bg-muted rounded-md">
                                    <p className="text-sm font-medium mb-2">Response will contain:</p>
                                    <ul className="text-xs space-y-1 text-muted-foreground">
                                        <li>• Message timestamp (ts)</li>
                                        <li>• Channel ID</li>
                                        <li>• Action-specific details</li>
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ============================================
// ACTION CONFIG RENDERERS
// ============================================

function renderActionConfig(
    action: string,
    config: any,
    onUpdate: (field: string, value: any) => void
) {
    const actionConfig = config[getActionConfigKey(action)] || {};

    switch (action) {
        case "post_message":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel">Channel</Label>
                        <Input
                            id="channel"
                            placeholder="#general or C01234567"
                            value={actionConfig.channel || ""}
                            onChange={(e) => onUpdate("channel", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Use {"{{variable}}"} for dynamic values
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="text">Message</Label>
                        <Textarea
                            id="text"
                            placeholder="Hello {{contact.firstName}}!"
                            value={actionConfig.text || ""}
                            onChange={(e) => onUpdate("text", e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>
            );

        case "send_dm":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="userId">User ID</Label>
                        <Input
                            id="userId"
                            placeholder="U01234567 or {{userId}}"
                            value={actionConfig.userId || ""}
                            onChange={(e) => onUpdate("userId", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="text">Message</Label>
                        <Textarea
                            id="text"
                            placeholder="Your message here..."
                            value={actionConfig.text || ""}
                            onChange={(e) => onUpdate("text", e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>
            );

        case "create_channel":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Channel Name</Label>
                        <Input
                            id="name"
                            placeholder="new-channel"
                            value={actionConfig.name || ""}
                            onChange={(e) => onUpdate("name", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            placeholder="Channel description..."
                            value={actionConfig.description || ""}
                            onChange={(e) => onUpdate("description", e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isPrivate"
                            checked={actionConfig.isPrivate || false}
                            onChange={(e) => onUpdate("isPrivate", e.target.checked)}
                        />
                        <Label htmlFor="isPrivate">Private Channel</Label>
                    </div>
                </div>
            );

        case "update_message":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel">Channel</Label>
                        <Input
                            id="channel"
                            placeholder="#general"
                            value={actionConfig.channel || ""}
                            onChange={(e) => onUpdate("channel", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="messageTs">Message Timestamp</Label>
                        <Input
                            id="messageTs"
                            placeholder="{{slackResponse.ts}}"
                            value={actionConfig.messageTs || ""}
                            onChange={(e) => onUpdate("messageTs", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="text">New Message</Label>
                        <Textarea
                            id="text"
                            placeholder="Updated message..."
                            value={actionConfig.text || ""}
                            onChange={(e) => onUpdate("text", e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>
            );

        case "add_reaction":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel">Channel</Label>
                        <Input
                            id="channel"
                            placeholder="#general"
                            value={actionConfig.channel || ""}
                            onChange={(e) => onUpdate("channel", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timestamp">Message Timestamp</Label>
                        <Input
                            id="timestamp"
                            placeholder="{{slackResponse.ts}}"
                            value={actionConfig.timestamp || ""}
                            onChange={(e) => onUpdate("timestamp", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emoji">Emoji (without colons)</Label>
                        <Input
                            id="emoji"
                            placeholder="thumbsup"
                            value={actionConfig.emoji || ""}
                            onChange={(e) => onUpdate("emoji", e.target.value)}
                        />
                    </div>
                </div>
            );

        case "set_topic":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel">Channel</Label>
                        <Input
                            id="channel"
                            placeholder="#general"
                            value={actionConfig.channel || ""}
                            onChange={(e) => onUpdate("channel", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
                        <Input
                            id="topic"
                            placeholder="New channel topic..."
                            value={actionConfig.topic || ""}
                            onChange={(e) => onUpdate("topic", e.target.value)}
                        />
                    </div>
                </div>
            );

        case "invite_to_channel":
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel">Channel</Label>
                        <Input
                            id="channel"
                            placeholder="#general"
                            value={actionConfig.channel || ""}
                            onChange={(e) => onUpdate("channel", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="users">User IDs (comma-separated)</Label>
                        <Input
                            id="users"
                            placeholder="U01234567,U09876543"
                            value={actionConfig.users?.join(",") || ""}
                            onChange={(e) =>
                                onUpdate("users", e.target.value.split(",").map((u) => u.trim()))
                            }
                        />
                    </div>
                </div>
            );

        default:
            return <p className="text-sm text-muted-foreground">Select an action to configure</p>;
    }
}

// ============================================
// HELPERS
// ============================================

function getActionConfigKey(action: string): string {
    const keyMap: Record<string, string> = {
        post_message: "postMessage",
        send_dm: "sendDm",
        create_channel: "createChannel",
        update_message: "updateMessage",
        add_reaction: "addReaction",
        upload_file: "uploadFile",
        set_topic: "setTopic",
        invite_to_channel: "inviteToChannel",
    };
    return keyMap[action] || action;
}
