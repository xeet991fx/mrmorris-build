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
import { PlusCircle, Edit3, Search, FileText, Archive } from "lucide-react";
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

interface NotionNodeConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    workspaceId?: string;
    workflowId?: string;
}

type NotionAction = "create_page" | "update_page" | "query_database" | "retrieve_page" | "archive_page";

const NOTION_ACTIONS = [
    { value: "create_page", label: "Create Page", description: "Create a new page in a database", icon: PlusCircle },
    { value: "update_page", label: "Update Page", description: "Update an existing page", icon: Edit3 },
    { value: "query_database", label: "Query Database", description: "Search and filter database entries", icon: Search },
    { value: "retrieve_page", label: "Retrieve Page", description: "Get a specific page by ID", icon: FileText },
    { value: "archive_page", label: "Archive Page", description: "Move a page to archive", icon: Archive },
];

// ============================================
// NOTION NODE CONFIG COMPONENT
// ============================================

export default function NotionNodeConfig({ step, onUpdate, workspaceId, workflowId }: NotionNodeConfigProps) {
    const config = step.config || {};
    const selectedAction = config.action as NotionAction | undefined;
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
                    What do you want to do with Notion?
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="action">Notion Action</Label>
                <Select
                    value={selectedAction || ""}
                    onValueChange={(value) => handleConfigUpdate("action", value as NotionAction)}
                >
                    <SelectTrigger id="action">
                        <SelectValue placeholder="Select an action..." />
                    </SelectTrigger>
                    <SelectContent>
                        {NOTION_ACTIONS.map((action) => {
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
                    <h3 className="text-sm font-semibold">Step 2: Connect Notion Workspace</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Authorize access to your Notion workspace
                    </p>
                </div>

                <OAuthConnectButton
                    integrationType="notion"
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
                                value={config.responseVariable || "notionData"}
                                onChange={(e) => handleConfigUpdate("responseVariable", e.target.value)}
                                placeholder="notionData"
                            />
                            <p className="text-xs text-muted-foreground">
                                Access this data in later steps using {`{{notionData}}`}
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
            case "create_page":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="database">Database</Label>
                            <DynamicFieldSelect
                                integrationType="notion"
                                fieldType="database"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.databaseId || ""}
                                onChange={(value) => handleConfigUpdate("databaseId", value)}
                                placeholder="Select database..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pageTitle">Page Title</Label>
                            <DragInput
                                id="pageTitle"
                                value={config.pageTitle || ""}
                                onChange={(value) => handleConfigUpdate("pageTitle", value)}
                                placeholder={`New Page - {{contact.name}}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="properties">Page Properties (JSON)</Label>
                            <DragTextarea
                                id="properties"
                                value={config.properties || ""}
                                onChange={(value) => handleConfigUpdate("properties", value)}
                                placeholder={`{"Email": "{{contact.email}}", "Status": "Active"}`}
                                rows={6}
                            />
                            <p className="text-xs text-muted-foreground">
                                Use {`{{variable}}`} syntax to insert dynamic values
                            </p>
                        </div>
                    </>
                );

            case "update_page":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="pageId">Page ID</Label>
                            <DragInput
                                id="pageId"
                                value={config.pageId || ""}
                                onChange={(value) => handleConfigUpdate("pageId", value)}
                                placeholder={`{{pageId}} or static ID`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="properties">Properties to Update (JSON)</Label>
                            <DragTextarea
                                id="properties"
                                value={config.properties || ""}
                                onChange={(value) => handleConfigUpdate("properties", value)}
                                placeholder={`{"Status": "Completed", "LastUpdated": "{{now}}"}`}
                                rows={6}
                            />
                        </div>
                    </>
                );

            case "query_database":
                return (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="database">Database</Label>
                            <DynamicFieldSelect
                                integrationType="notion"
                                fieldType="database"
                                credentialId={credentialId!}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.databaseId || ""}
                                onChange={(value) => handleConfigUpdate("databaseId", value)}
                                placeholder="Select database..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="filter">Filter (JSON, optional)</Label>
                            <DragTextarea
                                id="filter"
                                value={config.filter || ""}
                                onChange={(value) => handleConfigUpdate("filter", value)}
                                placeholder='{"property": "Status", "select": {"equals": "Active"}}'
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave empty to retrieve all entries
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="limit">Max Results</Label>
                            <Input
                                id="limit"
                                type="number"
                                value={config.limit || 100}
                                onChange={(e) => handleConfigUpdate("limit", parseInt(e.target.value))}
                                placeholder="100"
                            />
                        </div>
                    </>
                );

            case "retrieve_page":
                return (
                    <div className="space-y-2">
                        <Label htmlFor="pageId">Page ID</Label>
                        <DragInput
                            id="pageId"
                            value={config.pageId || ""}
                            onChange={(value) => handleConfigUpdate("pageId", value)}
                            placeholder={`{{pageId}} or static ID`}
                        />
                    </div>
                );

            case "archive_page":
                return (
                    <div className="space-y-2">
                        <Label htmlFor="pageId">Page ID to Archive</Label>
                        <DragInput
                            id="pageId"
                            value={config.pageId || ""}
                            onChange={(value) => handleConfigUpdate("pageId", value)}
                            placeholder={`{{pageId}} or static ID`}
                        />
                    </div>
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
