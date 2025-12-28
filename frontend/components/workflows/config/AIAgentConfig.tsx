"use client";

import { WorkflowStep } from "@/lib/workflow/types";
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
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

// ============================================
// AI AGENT CONFIG COMPONENT
// ============================================

interface AIAgentConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
}

export default function AIAgentConfig({ step, onUpdate }: AIAgentConfigProps) {
    const config = step.config || {};

    const handleConfigUpdate = (field: string, value: any) => {
        onUpdate({
            config: {
                ...config,
                [field]: value,
            },
        });
    };

    const insertPlaceholder = (field: string, placeholder: string) => {
        const currentValue = config[field] || "";
        handleConfigUpdate(field, currentValue + `{{${placeholder}}}`);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
                <div className="w-10 h-10 rounded-md bg-violet-600 flex items-center justify-center text-white">
                    <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">AI Agent Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        AI reasoning with full CRM tool access
                    </p>
                </div>
            </div>

            {/* Task Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Task Instruction</CardTitle>
                    <CardDescription>
                        What should the AI agent do? Be specific and clear.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="taskPrompt">Task Prompt</Label>
                        <Textarea
                            id="taskPrompt"
                            placeholder="Find all contacts with email domain {{contact.company}} and create deals for qualified leads"
                            value={config.taskPrompt || ""}
                            onChange={(e) => handleConfigUpdate("taskPrompt", e.target.value)}
                            rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                            Use {"{{placeholders}}"} to insert dynamic values
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertPlaceholder("taskPrompt", "contact.email")}
                        >
                            + Contact Email
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertPlaceholder("taskPrompt", "contact.firstName")}
                        >
                            + First Name
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => insertPlaceholder("taskPrompt", "contact.company")}
                        >
                            + Company
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
                        <Textarea
                            id="additionalContext"
                            placeholder="Include any additional information the agent should know..."
                            value={config.additionalContext || ""}
                            onChange={(e) => handleConfigUpdate("additionalContext", e.target.value)}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Agent Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>Agent Type</CardTitle>
                    <CardDescription>Which specialized agent should handle this task</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Agent Type</Label>
                        <Select
                            value={config.agentType || "auto"}
                            onValueChange={(value) => handleConfigUpdate("agentType", value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">
                                    <div>
                                        <div className="font-medium">Auto (Recommended)</div>
                                        <div className="text-xs text-muted-foreground">
                                            Automatically selects the best agent
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="contact">
                                    <div>
                                        <div className="font-medium">Contact Agent</div>
                                        <div className="text-xs text-muted-foreground">
                                            Search, create, update contacts
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="deal">
                                    <div>
                                        <div className="font-medium">Deal Agent</div>
                                        <div className="text-xs text-muted-foreground">
                                            Manage deals and pipelines
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="email">
                                    <div>
                                        <div className="font-medium">Email Agent</div>
                                        <div className="text-xs text-muted-foreground">
                                            Draft and send emails
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="task">
                                    <div>
                                        <div className="font-medium">Task Agent</div>
                                        <div className="text-xs text-muted-foreground">
                                            Create and manage tasks
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="workflow">
                                    <div>
                                        <div className="font-medium">Workflow Agent</div>
                                        <div className="text-xs text-muted-foreground">
                                            Manage workflow enrollments
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="general">
                                    <div>
                                        <div className="font-medium">General Agent</div>
                                        <div className="text-xs text-muted-foreground">
                                            General-purpose CRM operations
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="systemPromptOverride">System Prompt Override (Optional)</Label>
                        <Textarea
                            id="systemPromptOverride"
                            placeholder="You are a helpful assistant that..."
                            value={config.systemPromptOverride || ""}
                            onChange={(e) => handleConfigUpdate("systemPromptOverride", e.target.value)}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Override the default agent behavior (advanced)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Context Inclusion */}
            <Card>
                <CardHeader>
                    <CardTitle>Context Inclusion</CardTitle>
                    <CardDescription>What data should be available to the agent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="includeEntityData"
                            checked={config.includeEntityData !== false}
                            onChange={(e) => handleConfigUpdate("includeEntityData", e.target.checked)}
                        />
                        <Label htmlFor="includeEntityData">Include entity data (contact, deal, etc.)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="includeVariables"
                            checked={config.includeVariables !== false}
                            onChange={(e) => handleConfigUpdate("includeVariables", e.target.checked)}
                        />
                        <Label htmlFor="includeVariables">Include workflow variables</Label>
                    </div>
                </CardContent>
            </Card>

            {/* Execution Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Execution Settings</CardTitle>
                    <CardDescription>Timeout and performance settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="timeout">Timeout (seconds)</Label>
                        <div className="flex items-center gap-4">
                            <Slider
                                id="timeout"
                                min={10}
                                max={300}
                                step={10}
                                value={[config.timeout ? config.timeout / 1000 : 60]}
                                onValueChange={([value]) => handleConfigUpdate("timeout", value * 1000)}
                                className="flex-1"
                            />
                            <span className="text-sm font-medium w-16 text-right">
                                {config.timeout ? config.timeout / 1000 : 60}s
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Maximum execution time (10s - 300s)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Response Handling */}
            <Card>
                <CardHeader>
                    <CardTitle>Response Handling</CardTitle>
                    <CardDescription>Store agent output in variables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="responseVariable">Response Variable</Label>
                        <Input
                            id="responseVariable"
                            placeholder="agentResponse"
                            value={config.responseVariable || ""}
                            onChange={(e) => handleConfigUpdate("responseVariable", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Store agent's final response in this variable
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="toolHistoryVariable">Tool History Variable (Optional)</Label>
                        <Input
                            id="toolHistoryVariable"
                            placeholder="toolHistory"
                            value={config.toolHistoryVariable || ""}
                            onChange={(e) => handleConfigUpdate("toolHistoryVariable", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Store all tool executions for debugging
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="parseAsJSON"
                            checked={config.parseAsJSON || false}
                            onChange={(e) => handleConfigUpdate("parseAsJSON", e.target.checked)}
                        />
                        <Label htmlFor="parseAsJSON">Parse response as JSON</Label>
                    </div>
                </CardContent>
            </Card>

            {/* Help Section */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Agent Capabilities:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Analyzes the task and determines the best approach</li>
                    <li>• Accesses CRM tools (contacts, deals, emails, tasks, etc.)</li>
                    <li>• Executes multiple operations to complete the task</li>
                    <li>• Returns structured results to the workflow</li>
                </ul>
            </div>
        </div>
    );
}
