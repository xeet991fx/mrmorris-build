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
import { Badge } from "@/components/ui/badge";
import { BookOpen, PlusCircle, Edit3, Trash2, FileText } from "lucide-react";
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

interface GoogleSheetsNodeConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    workspaceId?: string;
    workflowId?: string;
}

type GoogleSheetsAction = "read" | "append" | "update" | "clear" | "create_sheet";

const GOOGLE_SHEETS_ACTIONS = [
    { value: "read", label: "Read Rows", description: "Read data from a spreadsheet", icon: BookOpen },
    { value: "append", label: "Append Row", description: "Add a new row to a sheet", icon: PlusCircle },
    { value: "update", label: "Update Rows", description: "Update existing rows", icon: Edit3 },
    { value: "clear", label: "Clear Rows", description: "Clear data from a range", icon: Trash2 },
    { value: "create_sheet", label: "Create Sheet", description: "Create a new sheet in spreadsheet", icon: FileText },
];

// ============================================
// GOOGLE SHEETS NODE CONFIG COMPONENT
// ============================================

export default function GoogleSheetsNodeConfig({ step, onUpdate, workspaceId, workflowId }: GoogleSheetsNodeConfigProps) {
    const config = step.config || {};
    const selectedAction = config.action as GoogleSheetsAction | undefined;
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
                    What do you want to do with Google Sheets?
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="action">Google Sheets Action</Label>
                <Select
                    value={selectedAction || ""}
                    onValueChange={(value) => handleConfigUpdate("action", value as GoogleSheetsAction)}
                >
                    <SelectTrigger id="action">
                        <SelectValue placeholder="Select an action..." />
                    </SelectTrigger>
                    <SelectContent>
                        {GOOGLE_SHEETS_ACTIONS.map((action) => {
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
                    <h3 className="text-sm font-semibold">Step 2: Connect Google Account</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Authorize access to your Google Sheets
                    </p>
                </div>

                <OAuthConnectButton
                    integrationType="google_sheets"
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
                        {/* Spreadsheet Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="spreadsheet">Spreadsheet</Label>
                            <DynamicFieldSelect
                                integrationType="google_sheets"
                                fieldType="spreadsheet"
                                credentialId={credentialId}
                                workspaceId={workspaceId || ""}
                                workflowId={workflowId || ""}
                                value={config.spreadsheetId || ""}
                                onChange={(value) => handleConfigUpdate("spreadsheetId", value)}
                                placeholder="Select spreadsheet..."
                            />
                        </div>

                        {/* Worksheet Selection (if spreadsheet is selected) */}
                        {config.spreadsheetId && (
                            <div className="space-y-2">
                                <Label htmlFor="worksheet">Worksheet</Label>
                                <DynamicFieldSelect
                                    integrationType="google_sheets"
                                    fieldType="worksheet"
                                    credentialId={credentialId}
                                    workspaceId={workspaceId || ""}
                                    workflowId={workflowId || ""}
                                    value={config.worksheetId || ""}
                                    onChange={(value) => handleConfigUpdate("worksheetId", value)}
                                    parentValue={config.spreadsheetId}
                                    placeholder="Select worksheet..."
                                />
                            </div>
                        )}

                        {/* Action-Specific Configuration */}
                        {selectedAction === "read" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="range">Range (e.g., A1:D10)</Label>
                                    <DragInput
                                        id="range"
                                        value={config.range || ""}
                                        onChange={(value) => handleConfigUpdate("range", value)}
                                        placeholder="A1:Z100"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use {`{{variable}}`} syntax for dynamic values
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hasHeaders">First Row Contains Headers</Label>
                                    <Select
                                        value={config.hasHeaders ? "true" : "false"}
                                        onValueChange={(value) => handleConfigUpdate("hasHeaders", value === "true")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Yes</SelectItem>
                                            <SelectItem value="false">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {selectedAction === "append" && (
                            <div className="space-y-2">
                                <Label htmlFor="rowData">Row Data (JSON format)</Label>
                                <DragTextarea
                                    id="rowData"
                                    value={config.rowData || ""}
                                    onChange={(value) => handleConfigUpdate("rowData", value)}
                                    placeholder={`{"name": "John Doe", "email": "{{contact.email}}", "status": "Active"}`}
                                    rows={6}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {`{{variable}}`} syntax to insert dynamic values
                                </p>
                            </div>
                        )}

                        {selectedAction === "update" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="range">Range to Update</Label>
                                    <DragInput
                                        id="range"
                                        value={config.range || ""}
                                        onChange={(value) => handleConfigUpdate("range", value)}
                                        placeholder="A2:D2"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="values">Values (JSON Array)</Label>
                                    <DragTextarea
                                        id="values"
                                        value={config.values || ""}
                                        onChange={(value) => handleConfigUpdate("values", value)}
                                        placeholder={`[["{{contact.name}}", "{{contact.email}}", "Updated"]]`}
                                        rows={4}
                                    />
                                </div>
                            </>
                        )}

                        {selectedAction === "clear" && (
                            <div className="space-y-2">
                                <Label htmlFor="range">Range to Clear</Label>
                                <DragInput
                                    id="range"
                                    value={config.range || ""}
                                    onChange={(value) => handleConfigUpdate("range", value)}
                                    placeholder="A2:Z100"
                                />
                            </div>
                        )}

                        {selectedAction === "create_sheet" && (
                            <div className="space-y-2">
                                <Label htmlFor="sheetName">New Sheet Name</Label>
                                <DragInput
                                    id="sheetName"
                                    value={config.sheetName || ""}
                                    onChange={(value) => handleConfigUpdate("sheetName", value)}
                                    placeholder="New Sheet"
                                />
                            </div>
                        )}

                        {/* Response Variable */}
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="responseVariable">Save Response As (Variable Name)</Label>
                            <Input
                                id="responseVariable"
                                value={config.responseVariable || "sheetsData"}
                                onChange={(e) => handleConfigUpdate("responseVariable", e.target.value)}
                                placeholder="sheetsData"
                            />
                            <p className="text-xs text-muted-foreground">
                                Access this data in later steps using {`{{sheetsData}}`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
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
