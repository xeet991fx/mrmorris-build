"use client";

import { useState } from "react";
import { WorkflowStep } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { DragInput } from "../DragInput";
import { DragTextarea } from "../DragTextarea";
import { DataSourceFloatingCard } from "../DataSourceFloatingCard";
import { useDataSources } from "@/hooks/useDataSources";

// ============================================
// TYPES
// ============================================

interface TransformConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    workspaceId?: string;
    workflowId?: string;
}

interface SetOperation {
    variable: string;
    value: string;
}

interface MapOperation {
    from: string;
    to: string;
    transform?: string;
}

// ============================================
// TRANSFORM TYPES
// ============================================

const TRANSFORM_TYPES = [
    { value: "transform_set", label: "Set Variable", description: "Set or update variable values" },
    { value: "transform_map", label: "Map Data", description: "Transform object structures" },
    { value: "transform_filter", label: "Filter Array", description: "Filter arrays using conditions" },
];

const TRANSFORM_OPERATIONS = [
    { value: "uppercase", label: "Uppercase" },
    { value: "lowercase", label: "Lowercase" },
    { value: "trim", label: "Trim Whitespace" },
    { value: "split", label: "Split" },
    { value: "join", label: "Join" },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TransformConfig({ step, onUpdate, workspaceId, workflowId }: TransformConfigProps) {
    const [activeTab, setActiveTab] = useState("type");
    const config = step.config || {};
    const transformType = config.actionType || "transform_set";

    // Fetch available data sources for autocomplete
    const { dataSources } = useDataSources(workspaceId, workflowId, step.id);

    const updateConfig = (updates: any) => {
        onUpdate({
            config: {
                ...config,
                ...updates,
            },
        });
    };

    // ============================================
    // SET VARIABLE OPERATIONS
    // ============================================

    const setOperations = (config.operations || []) as SetOperation[];

    const addSetOperation = () => {
        updateConfig({
            operations: [...setOperations, { variable: "", value: "" }],
        });
    };

    const updateSetOperation = (index: number, field: keyof SetOperation, value: string) => {
        const updated = [...setOperations];
        updated[index] = { ...updated[index], [field]: value };
        updateConfig({ operations: updated });
    };

    const removeSetOperation = (index: number) => {
        updateConfig({
            operations: setOperations.filter((_, i) => i !== index),
        });
    };

    // ============================================
    // MAP DATA OPERATIONS
    // ============================================

    const mapOperations = (config.mappings || []) as MapOperation[];

    const addMapOperation = () => {
        updateConfig({
            mappings: [...mapOperations, { from: "", to: "", transform: "" }],
        });
    };

    const updateMapOperation = (index: number, field: keyof MapOperation, value: string) => {
        const updated = [...mapOperations];
        updated[index] = { ...updated[index], [field]: value };
        updateConfig({ mappings: updated });
    };

    const removeMapOperation = (index: number) => {
        updateConfig({
            mappings: mapOperations.filter((_, i) => i !== index),
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                    <span className="text-xl">⚙️</span>
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Transform Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Set variables, map objects, or filter arrays
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="type">Transform Type</TabsTrigger>
                    <TabsTrigger value="operations">Operations</TabsTrigger>
                </TabsList>

                {/* TYPE TAB */}
                <TabsContent value="type" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Transform Type</CardTitle>
                            <CardDescription>
                                Choose how you want to transform the data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {TRANSFORM_TYPES.map((type) => (
                                    <div
                                        key={type.value}
                                        onClick={() => updateConfig({ actionType: type.value, operations: [], mappings: [] })}
                                        className={cn(
                                            "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                            transformType === type.value
                                                ? "border-emerald-500 bg-emerald-500/10"
                                                : "border-border hover:border-emerald-500/50 hover:bg-muted"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                                                transformType === type.value
                                                    ? "border-emerald-500 bg-emerald-500"
                                                    : "border-border"
                                            )}>
                                                {transformType === type.value && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{type.label}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {type.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* OPERATIONS TAB */}
                <TabsContent value="operations" className="space-y-4">
                    {transformType === "transform_set" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Set Variable Operations</CardTitle>
                                <CardDescription>
                                    Define variables and their values using expressions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {setOperations.map((op, index) => (
                                    <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">Operation {index + 1}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeSetOperation(index)}
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div>
                                            <Label>Variable Name</Label>
                                            <Input
                                                placeholder="e.g., fullName"
                                                value={op.variable}
                                                onChange={(e) => updateSetOperation(index, "variable", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Value (supports {"{{placeholders}}"})</Label>
                                            <DragTextarea
                                                value={op.value}
                                                onChange={(value) => updateSetOperation(index, "value", value)}
                                                placeholder={'e.g., {{firstName}} {{lastName}}'}
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    onClick={addSetOperation}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Add Operation
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {transformType === "transform_map" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Map Data Operations</CardTitle>
                                <CardDescription>
                                    Transform data from one structure to another
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {mapOperations.map((op, index) => (
                                    <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">Mapping {index + 1}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeMapOperation(index)}
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div>
                                            <Label>From (Source Path)</Label>
                                            <DragInput
                                                value={op.from}
                                                onChange={(value) => updateMapOperation(index, "from", value)}
                                                placeholder="e.g., response.data.email"
                                            />
                                        </div>
                                        <div>
                                            <Label>To (Target Path)</Label>
                                            <DragInput
                                                value={op.to}
                                                onChange={(value) => updateMapOperation(index, "to", value)}
                                                placeholder="e.g., contact.email"
                                            />
                                        </div>
                                        <div>
                                            <Label>Transform (Optional)</Label>
                                            <Select
                                                value={op.transform || "none"}
                                                onValueChange={(value) => updateMapOperation(index, "transform", value === "none" ? "" : value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="No transformation" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No transformation</SelectItem>
                                                    {TRANSFORM_OPERATIONS.map((transform) => (
                                                        <SelectItem key={transform.value} value={transform.value}>
                                                            {transform.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    onClick={addMapOperation}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Add Mapping
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {transformType === "transform_filter" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Filter Array</CardTitle>
                                <CardDescription>
                                    Filter arrays using condition expressions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Source Array</Label>
                                    <DragInput
                                        value={config.sourceArray || ""}
                                        onChange={(value) => updateConfig({ sourceArray: value })}
                                        placeholder="e.g., contacts or {{items}}"
                                    />
                                </div>

                                <div>
                                    <Label>Filter Condition</Label>
                                    <DragTextarea
                                        value={config.filterCondition || ""}
                                        onChange={(value) => updateConfig({ filterCondition: value })}
                                        placeholder={'e.g., item.status === "active" && item.score > 50'}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        JavaScript expression (use "item" for current element)
                                    </p>
                                </div>

                                <div>
                                    <Label>Result Variable</Label>
                                    <Input
                                        placeholder="e.g., filteredContacts"
                                        value={config.resultVariable || ""}
                                        onChange={(e) => updateConfig({ resultVariable: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Variable to store the filtered array
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Floating Data Source Card */}
            <DataSourceFloatingCard
                dataSources={dataSources}
                workspaceId={workspaceId}
                workflowId={workflowId}
            />
        </div>
    );
}
