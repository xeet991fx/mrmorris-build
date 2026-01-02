/**
 * Workflow Config Panel
 * 
 * Side panel for configuring workflow steps.
 * Uses modular config components for each step type.
 */

"use client";

import { useState, useEffect } from "react";
import {
    XMarkIcon,
    TrashIcon,
    BoltIcon,
    EnvelopeIcon,
    ClockIcon,
    ArrowsRightLeftIcon,
    FunnelIcon,
    ShieldExclamationIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    GlobeAltIcon,
    AdjustmentsHorizontalIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { GiArtificialIntelligence } from "react-icons/gi";
import { Loader2, GitBranch, Table, FileText } from "lucide-react";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getIntegrationMeta } from "@/lib/workflow/integrations";
import axios from "@/lib/axios";

// Import modular config components
import TriggerConfig from "./config/TriggerConfig";
import ActionConfig from "./config/ActionConfig";
import DelayConfig from "./config/DelayConfig";
import ConditionConfig from "./config/ConditionConfig";
import LoopConfig from "./config/LoopConfig";
import AIAgentConfig from "./config/AIAgentConfig";
import HttpActionConfig from "./config/HttpActionConfig";
import SlackNodeConfig from "./config/SlackNodeConfig";
import GoogleSheetsNodeConfig from "./config/GoogleSheetsNodeConfig";
import NotionNodeConfig from "./config/NotionNodeConfig";
import TransformConfig from "./config/TransformConfig";

// ============================================
// TYPES
// ============================================

interface WorkflowConfigPanelProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    onDelete: () => void;
    onClose: () => void;
    workspaceId?: string;
    workflowId?: string;
}

// ============================================
// PANEL INFO BY STEP TYPE
// ============================================

function getPanelInfo(stepType: string) {
    switch (stepType) {
        case "trigger":
            return {
                icon: <BoltIcon className="w-5 h-5" />,
                color: "from-violet-500 to-purple-600",
                bgColor: "bg-violet-500/10",
                label: "Configure Trigger",
            };
        case "action":
            return {
                icon: <EnvelopeIcon className="w-5 h-5" />,
                color: "from-blue-500 to-cyan-600",
                bgColor: "bg-blue-500/10",
                label: "Configure Action",
            };
        case "delay":
            return {
                icon: <ClockIcon className="w-5 h-5" />,
                color: "from-orange-500 to-amber-600",
                bgColor: "bg-orange-500/10",
                label: "Configure Delay",
            };
        case "condition":
            return {
                icon: <GitBranch className="w-5 h-5" />,
                color: "from-teal-500 to-cyan-600",
                bgColor: "bg-teal-500/10",
                label: "Configure Condition",
            };
        case "parallel":
            return {
                icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
                color: "from-blue-500 to-indigo-600",
                bgColor: "bg-blue-500/10",
                label: "Configure Parallel Split",
            };
        case "merge":
            return {
                icon: <FunnelIcon className="w-5 h-5" />,
                color: "from-cyan-500 to-blue-600",
                bgColor: "bg-cyan-500/10",
                label: "Configure Merge",
            };
        case "try_catch":
            return {
                icon: <ShieldExclamationIcon className="w-5 h-5" />,
                color: "from-amber-500 to-orange-600",
                bgColor: "bg-amber-500/10",
                label: "Configure Try/Catch",
            };
        case "loop":
            return {
                icon: <ArrowPathIcon className="w-5 h-5" />,
                color: "from-purple-500 to-pink-600",
                bgColor: "bg-purple-500/10",
                label: "Configure Loop",
            };
        case "ai_agent":
            return {
                icon: <GiArtificialIntelligence className="w-5 h-5" />,
                color: "from-gray-800 to-gray-900",
                bgColor: "bg-gray-800/10",
                label: "Configure AI Agent",
            };
        case "integration_slack": {
            const slackMeta = getIntegrationMeta("integration_slack");
            const SlackIcon = slackMeta?.icon;
            return {
                icon: SlackIcon ? <SlackIcon className="w-5 h-5" /> : <ChatBubbleLeftRightIcon className="w-5 h-5" />,
                color: "from-purple-600 to-purple-800",
                bgColor: "bg-purple-600/10",
                label: "Configure Slack",
            };
        }
        case "integration_google_sheets": {
            const sheetsMeta = getIntegrationMeta("integration_google_sheets");
            const SheetsIcon = sheetsMeta?.icon;
            return {
                icon: SheetsIcon ? <SheetsIcon className="w-5 h-5" /> : <Table className="w-5 h-5" />,
                color: "from-green-600 to-green-700",
                bgColor: "bg-green-600/10",
                label: "Configure Google Sheets",
            };
        }
        case "integration_notion": {
            const notionMeta = getIntegrationMeta("integration_notion");
            const NotionIcon = notionMeta?.icon;
            return {
                icon: NotionIcon ? <NotionIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />,
                color: "from-gray-800 to-gray-900",
                bgColor: "bg-gray-800/10",
                label: "Configure Notion",
            };
        }
        case "http_request":
            return {
                icon: <GlobeAltIcon className="w-5 h-5" />,
                color: "from-gray-600 to-gray-700",
                bgColor: "bg-gray-600/10",
                label: "Configure HTTP Request",
            };
        case "transform":
            return {
                icon: <AdjustmentsHorizontalIcon className="w-5 h-5" />,
                color: "from-emerald-500 to-teal-600",
                bgColor: "bg-emerald-500/10",
                label: "Configure Transform",
            };
        default:
            return {
                icon: <BoltIcon className="w-5 h-5" />,
                color: "from-gray-500 to-gray-600",
                bgColor: "bg-gray-500/10",
                label: "Configure Step",
            };
    }
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ValidationResult {
    canOpenConfig: boolean;
    reason?: string;
    message?: string;
}

export default function WorkflowConfigPanel({
    step,
    onUpdate,
    onDelete,
    onClose,
    workspaceId,
    workflowId,
}: WorkflowConfigPanelProps) {
    const [name, setName] = useState(step.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(true);

    // Validate step configuration when component mounts or when the step/workflow changes
    useEffect(() => {
        validateStepConfig();
    }, [step.id, workspaceId, workflowId]);

    // Update name when step changes
    useEffect(() => {
        setName(step.name);
        setShowDeleteConfirm(false);
    }, [step.id, step.name]);

    async function validateStepConfig() {
        // Always allow config to open
        // Validation is just for metadata, not gating
        if (!workspaceId || !workflowId) {
            setValidationResult({ canOpenConfig: true });
            setIsValidating(false);
            return;
        }

        setIsValidating(true);

        try {
            const response = await axios.get(
                `/workspaces/${workspaceId}/workflows/${workflowId}/steps/${step.id}/validation`
            );

            setValidationResult(response.data);
        } catch (error: any) {
            console.error('Validation error:', error);
            // On error, STILL allow config to open
            setValidationResult({
                canOpenConfig: true,
            });
        } finally {
            setIsValidating(false);
        }
    }

    const handleConfigChange = (newConfig: any) => {
        onUpdate({ config: newConfig });
    };

    const handleNameBlur = () => {
        if (name !== step.name) {
            onUpdate({ name });
        }
    };

    const handleDelete = () => {
        if (showDeleteConfirm) {
            onDelete();
        } else {
            setShowDeleteConfirm(true);
        }
    };

    const panelInfo = getPanelInfo(step.type);

    return (
        <div className="w-80 border-l border-border bg-card flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br shadow-sm",
                            panelInfo.color
                        )}
                    >
                        {panelInfo.icon}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {panelInfo.label}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                            {step.type} step
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    title="Close panel"
                >
                    <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-5">
                    {/* Step Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Step Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleNameBlur}
                            placeholder="Enter step name..."
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Validation Loading State */}
                    {isValidating && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    )}

                    {/* Step-specific config (always render) */}
                    {!isValidating && (
                        <>
                    {step.type === "trigger" && (
                        <TriggerConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "action" && (
                        <ActionConfig step={step} onChange={handleConfigChange} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "delay" && (
                        <DelayConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "condition" && (
                        <ConditionConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "loop" && (
                        <LoopConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "ai_agent" && (
                        <AIAgentConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "http_request" && (
                        <HttpActionConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "integration_slack" && (
                        <SlackNodeConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "integration_google_sheets" && (
                        <GoogleSheetsNodeConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "integration_notion" && (
                        <NotionNodeConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {step.type === "transform" && (
                        <TransformConfig step={step} onUpdate={onUpdate} workspaceId={workspaceId} workflowId={workflowId} />
                    )}
                    {(step.type === "parallel" || step.type === "merge" || step.type === "try_catch") && (
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Configuration for {step.type} nodes coming soon.
                            </p>
                        </div>
                    )}
                        </>
                    )}
                </div>
            </div>

            {/* Footer - Delete Button */}
            <div className="p-4 border-t border-border bg-muted/20">
                <button
                    onClick={handleDelete}
                    onMouseLeave={() => setShowDeleteConfirm(false)}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        showDeleteConfirm
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    )}
                >
                    <TrashIcon className="w-4 h-4" />
                    {showDeleteConfirm ? "Click again to confirm" : "Delete Step"}
                </button>
            </div>
        </div>
    );
}
