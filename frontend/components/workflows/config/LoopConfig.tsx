"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Slider } from "@/components/ui/slider";

// ============================================
// LOOP CONFIG COMPONENT
// ============================================

interface LoopConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
}

export default function LoopConfig({ step, onUpdate }: LoopConfigProps) {
    const config = step.config || {};

    const handleConfigUpdate = (field: string, value: any) => {
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
                    <ArrowPathIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Loop Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        Iterate over arrays and process each item
                    </p>
                </div>
            </div>

            {/* Source Array */}
            <Card>
                <CardHeader>
                    <CardTitle>Source Array</CardTitle>
                    <CardDescription>Configure the array to iterate over</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="sourceType">Source Type</Label>
                        <Select
                            value={config.sourceType || "variable"}
                            onValueChange={(value) => handleConfigUpdate("sourceType", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="variable">Variable</SelectItem>
                                <SelectItem value="field">Entity Field</SelectItem>
                                <SelectItem value="expression">Expression</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sourceArray">
                            {config.sourceType === "expression"
                                ? "Expression"
                                : config.sourceType === "field"
                                ? "Field Path"
                                : "Variable Name"}
                        </Label>
                        <Input
                            id="sourceArray"
                            placeholder={
                                config.sourceType === "expression"
                                    ? "{{contacts}}"
                                    : config.sourceType === "field"
                                    ? "customData.items"
                                    : "myArray"
                            }
                            value={config.sourceArray || ""}
                            onChange={(e) => handleConfigUpdate("sourceArray", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {config.sourceType === "expression"
                                ? "Use {{variable}} syntax for dynamic values"
                                : config.sourceType === "field"
                                ? "Dot notation for nested fields"
                                : "Name of the variable containing the array"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Loop Variables */}
            <Card>
                <CardHeader>
                    <CardTitle>Loop Variables</CardTitle>
                    <CardDescription>Variable names available during iteration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="itemVariable">Item Variable</Label>
                        <Input
                            id="itemVariable"
                            placeholder="item"
                            value={config.itemVariable || "item"}
                            onChange={(e) => handleConfigUpdate("itemVariable", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Access current item as {`{{${config.itemVariable || "item"}}}`}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="indexVariable">Index Variable</Label>
                        <Input
                            id="indexVariable"
                            placeholder="index"
                            value={config.indexVariable || "index"}
                            onChange={(e) => handleConfigUpdate("indexVariable", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Access current index as {`{{${config.indexVariable || "index"}}}`}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Execution Mode */}
            <Card>
                <CardHeader>
                    <CardTitle>Execution Mode</CardTitle>
                    <CardDescription>How iterations should be processed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Mode</Label>
                        <Select
                            value={config.mode || "sequential"}
                            onValueChange={(value) => handleConfigUpdate("mode", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sequential">
                                    <div>
                                        <div className="font-medium">Sequential</div>
                                        <div className="text-xs text-muted-foreground">
                                            Process one item at a time
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="parallel">
                                    <div>
                                        <div className="font-medium">Parallel</div>
                                        <div className="text-xs text-muted-foreground">
                                            Process multiple items simultaneously
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {config.mode === "parallel" && (
                        <div className="space-y-2">
                            <Label htmlFor="batchSize">Batch Size</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    id="batchSize"
                                    min={1}
                                    max={50}
                                    step={1}
                                    value={[config.batchSize || 10]}
                                    onValueChange={([value]) => handleConfigUpdate("batchSize", value)}
                                    className="flex-1"
                                />
                                <span className="text-sm font-medium w-12 text-right">
                                    {config.batchSize || 10}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Number of items to process concurrently
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Loop Control */}
            <Card>
                <CardHeader>
                    <CardTitle>Loop Control</CardTitle>
                    <CardDescription>Safety limits and break conditions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="maxIterations">Max Iterations</Label>
                        <div className="flex items-center gap-4">
                            <Slider
                                id="maxIterations"
                                min={1}
                                max={1000}
                                step={10}
                                value={[config.maxIterations || 1000]}
                                onValueChange={([value]) => handleConfigUpdate("maxIterations", value)}
                                className="flex-1"
                            />
                            <span className="text-sm font-medium w-16 text-right">
                                {config.maxIterations || 1000}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Safety limit (max: 1000)</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="breakCondition">Break Condition (Optional)</Label>
                        <Textarea
                            id="breakCondition"
                            placeholder='{"field": "status", "operator": "equals", "value": "completed"}'
                            value={
                                config.breakCondition
                                    ? JSON.stringify(config.breakCondition, null, 2)
                                    : ""
                            }
                            onChange={(e) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                                    handleConfigUpdate("breakCondition", parsed);
                                } catch {
                                    // Invalid JSON, don't update
                                }
                            }}
                            rows={4}
                            className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                            Condition to break loop early (JSON format)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <CardTitle>Result Handling</CardTitle>
                    <CardDescription>Store iteration results in a variable</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="aggregateResults"
                            checked={config.aggregateResults || false}
                            onChange={(e) => handleConfigUpdate("aggregateResults", e.target.checked)}
                        />
                        <Label htmlFor="aggregateResults">Collect iteration results</Label>
                    </div>

                    {config.aggregateResults && (
                        <div className="space-y-2">
                            <Label htmlFor="resultVariable">Result Variable Name</Label>
                            <Input
                                id="resultVariable"
                                placeholder="loopResults"
                                value={config.resultVariable || ""}
                                onChange={(e) => handleConfigUpdate("resultVariable", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Array of iteration results will be stored here
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Help Section */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Loop Example:</p>
                <div className="text-xs space-y-1 text-muted-foreground font-mono">
                    <p>sourceArray: "contacts"</p>
                    <p>itemVariable: "contact"</p>
                    <p>In loop body: {"{{contact.email}}"} {"{{index}}"}</p>
                </div>
            </div>
        </div>
    );
}
