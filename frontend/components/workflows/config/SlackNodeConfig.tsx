"use client";

import { useState, useEffect } from "react";
import { WorkflowStep } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Send, FolderPlus, Edit3, Smile, Upload, Hash, UserPlus } from "lucide-react";
import { DragInput } from "../DragInput";
import { DragTextarea } from "../DragTextarea";
import { DataSourceFloatingCard } from "../DataSourceFloatingCard";
import { DynamicFieldSelect } from "../DynamicFieldSelect";
import OAuthConnectButton from "../OAuthConnectButton";
import { useDataSources } from "@/hooks/useDataSources";
import { DndContext } from "@dnd-kit/core";
import { useDataSourceStore } from "@/store/useDataSourceStore";

// ============================================
// TYPES
// ============================================

interface SlackNodeConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    workspaceId?: string;
    workflowId?: string;
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
    { value: "post_message", label: "Post Message", description: "Post a message to a channel", icon: MessageSquare },
    { value: "send_dm", label: "Send Direct Message", description: "Send a DM to a user", icon: Send },
    { value: "create_channel", label: "Create Channel", description: "Create a new channel", icon: FolderPlus },
    { value: "update_message", label: "Update Message", description: "Update an existing message", icon: Edit3 },
    { value: "add_reaction", label: "Add Reaction", description: "Add an emoji reaction", icon: Smile },
    { value: "upload_file", label: "Upload File", description: "Upload a file to a channel", icon: Upload },
    { value: "set_topic", label: "Set Channel Topic", description: "Update channel topic", icon: Hash },
    { value: "invite_to_channel", label: "Invite to Channel", description: "Invite users to a channel", icon: UserPlus },
];

// ============================================
// SLACK NODE CONFIG COMPONENT
// ============================================

export default function SlackNodeConfig({ step, onUpdate, workspaceId, workflowId }: SlackNodeConfigProps) {
    const config = step.config || {};
    const selectedAction = config.action as SlackAction | undefined;
    const credentialId = config.credentialId as string | undefined;

    // Fetch available data sources for autocomplete
    const { dataSources } = useDataSources(workspaceId, workflowId, step.id);
    const { insertPlaceholder } = useDataSourceStore();

    const handleConfigUpdate = (field: string, value: any) => {
        onUpdate({
            config: {
                ...config,
                [field]: value,
            },
        });
    };

    const handleCredentialCreated = (newCredentialId: string) => {
        handleConfigUpdate("credentialId", newCredentialId);
    };

    // ============================================
    // RENDER: STEP 1 - SELECT ACTION
    // ============================================

    const renderActionSelector = () => (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold">Step 1: Choose Action</h3>
                <p className="text-xs text-muted-foreground mt-1">
                    What do you want to do with Slack?
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="action">Slack Action</Label>
                <Select
                    value={selectedAction || ""}
                    onValueChange={(value) => handleConfigUpdate("action", value as SlackAction)}
                >
                    <SelectTrigger id="action">
                        <SelectValue placeholder="Select an action..." />
                    </SelectTrigger>
                    <SelectContent>
                        {SLACK_ACTIONS.map((action) => {
                            const IconComponent = action.icon;
                            return (
                                <SelectItem key={action.value} value={action.value}>
                                    <div className="flex items-center gap-2">
                                        <IconComponent className="w-4 h-4" />
                                        <div>
                                            <div className="font-medium">{action.label}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {action.description}
                                            </div>
                                        </div>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    // ============================================
    // RENDER: STEP 2 - CONNECT ACCOUNT
    // ============================================

    const renderConnectionStep = () => {
        if (!selectedAction) return null;

        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-semibold">Step 2: Connect Slack Workspace</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Authorize access to your Slack workspace
                    </p>
                </div>

                <OAuthConnectButton
                    integrationType="slack"
                    workspaceId={workspaceId || ""}
                    action={selectedAction}
                    credentialId={credentialId}
                    onCredentialCreated={handleCredentialCreated}
                />
            </div>
        );
    };

    // ============================================
    // RENDER: STEP 3 - CONFIGURE SETTINGS
    // ============================================

    const renderConfigurationStep = () => {
        if (!selectedAction || !credentialId) return null;

        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-semibold">Step 3: Configure Details</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Set up the specific action parameters
                    </p>
                </div>

                <Card>
                    <CardContent className="p-4 space-y-4">
                        {renderActionFields()}

                        {/* Response Variable */}
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="responseVariable">Save Response As (Variable Name)</Label>
                            <Input
                                id="responseVariable"
                                value={config.responseVariable || "slackData"}
                                onChange={(e) => handleConfigUpdate("responseVariable", e.target.value)}
                                placeholder="slackData"
                            />
                            <p className="text-xs text-muted-foreground">
                                Access this data in later steps using {`{{slackData}}`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // ============================================
    // RENDER: ACTION-SPECIFIC FIELDS
    // ============================================

    const renderActionFields = () => {
        switch (selectedAction) {
            case "post_message":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channel">Channel</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="channel"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.channel || ""}
                                onChange={(value) => handleConfigUpdate("channel", value)}
                                placeholder="Select channel..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <DragTextarea
                                id="message"
                                value={config.message || ""}
                                onChange={(value) => handleConfigUpdate("message", value)}
                                placeholder={`Hello {{contact.firstName}}!`}
                                rows={6}
                            />
                            <p className="text-xs text-muted-foreground">
                                Use {`{{variable}}`} syntax to insert dynamic values
                            </p>
                        </div>
                    </>
                );

            case "send_dm":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="user">User</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="user"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.userId || ""}
                                onChange={(value) => handleConfigUpdate("userId", value)}
                                placeholder="Select user..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <DragTextarea
                                id="message"
                                value={config.message || ""}
                                onChange={(value) => handleConfigUpdate("message", value)}
                                placeholder="Your message here..."
                                rows={6}
                            />
                        </div>
                    </>
                );

            case "create_channel":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channelName">Channel Name</Label>
                            <DragInput
                                id="channelName"
                                value={config.channelName || ""}
                                onChange={(value) => handleConfigUpdate("channelName", value)}
                                placeholder="new-channel"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <DragInput
                                id="description"
                                value={config.description || ""}
                                onChange={(value) => handleConfigUpdate("description", value)}
                                placeholder="Channel description..."
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={config.isPrivate || false}
                                onChange={(e) => handleConfigUpdate("isPrivate", e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="isPrivate">Private Channel</Label>
                        </div>
                    </>
                );

            case "update_message":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channel">Channel</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="channel"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.channel || ""}
                                onChange={(value) => handleConfigUpdate("channel", value)}
                                placeholder="Select channel..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="messageTs">Message Timestamp</Label>
                            <DragInput
                                id="messageTs"
                                value={config.messageTs || ""}
                                onChange={(value) => handleConfigUpdate("messageTs", value)}
                                placeholder={`{{slackData.ts}}`}
                            />
                            <p className="text-xs text-muted-foreground">
                                Message timestamp from a previous Slack action
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newMessage">New Message</Label>
                            <DragTextarea
                                id="newMessage"
                                value={config.newMessage || ""}
                                onChange={(value) => handleConfigUpdate("newMessage", value)}
                                placeholder="Updated message..."
                                rows={6}
                            />
                        </div>
                    </>
                );

            case "add_reaction":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channel">Channel</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="channel"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.channel || ""}
                                onChange={(value) => handleConfigUpdate("channel", value)}
                                placeholder="Select channel..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="messageTs">Message Timestamp</Label>
                            <DragInput
                                id="messageTs"
                                value={config.messageTs || ""}
                                onChange={(value) => handleConfigUpdate("messageTs", value)}
                                placeholder={`{{slackData.ts}}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emoji">Emoji (without colons)</Label>
                            <Input
                                id="emoji"
                                value={config.emoji || ""}
                                onChange={(e) => handleConfigUpdate("emoji", e.target.value)}
                                placeholder="thumbsup"
                            />
                            <p className="text-xs text-muted-foreground">
                                Example: thumbsup, fire, rocket
                            </p>
                        </div>
                    </>
                );

            case "upload_file":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channel">Channel</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="channel"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.channel || ""}
                                onChange={(value) => handleConfigUpdate("channel", value)}
                                placeholder="Select channel..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fileUrl">File URL</Label>
                            <DragInput
                                id="fileUrl"
                                value={config.fileUrl || ""}
                                onChange={(value) => handleConfigUpdate("fileUrl", value)}
                                placeholder={`{{fileUrl}} or https://...`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fileName">File Name (optional)</Label>
                            <DragInput
                                id="fileName"
                                value={config.fileName || ""}
                                onChange={(value) => handleConfigUpdate("fileName", value)}
                                placeholder="document.pdf"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comment">Comment (optional)</Label>
                            <DragTextarea
                                id="comment"
                                value={config.comment || ""}
                                onChange={(value) => handleConfigUpdate("comment", value)}
                                placeholder="File description..."
                                rows={3}
                            />
                        </div>
                    </>
                );

            case "set_topic":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channel">Channel</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="channel"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.channel || ""}
                                onChange={(value) => handleConfigUpdate("channel", value)}
                                placeholder="Select channel..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="topic">Topic</Label>
                            <DragInput
                                id="topic"
                                value={config.topic || ""}
                                onChange={(value) => handleConfigUpdate("topic", value)}
                                placeholder="New channel topic..."
                            />
                        </div>
                    </>
                );

            case "invite_to_channel":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="channel">Channel</Label>
                            <DynamicFieldSelect
                                integrationType="slack"
                                fieldType="channel"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.channel || ""}
                                onChange={(value) => handleConfigUpdate("channel", value)}
                                placeholder="Select channel..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="users">Users to Invite</Label>
                            <DragInput
                                id="users"
                                value={config.users || ""}
                                onChange={(value) => handleConfigUpdate("users", value)}
                                placeholder={`{{userId}} or U01234567`}
                            />
                            <p className="text-xs text-muted-foreground">
                                For multiple users, separate with commas
                            </p>
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <DndContext>
            <div className="space-y-6">
                {/* Step 1: Action Selection */}
                {renderActionSelector()}

                {selectedAction && <Separator className="my-6" />}

                {/* Step 2: Connection */}
                {renderConnectionStep()}

                {credentialId && selectedAction && <Separator className="my-6" />}

                {/* Step 3: Configuration */}
                {renderConfigurationStep()}

                {/* Data Source Floating Card */}
                <DataSourceFloatingCard dataSources={dataSources} />
            </div>
        </DndContext>
    );
}
