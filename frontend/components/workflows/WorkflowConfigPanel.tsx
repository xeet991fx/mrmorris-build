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
} from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// Import modular config components
import TriggerConfig from "./config/TriggerConfig";
import ActionConfig from "./config/ActionConfig";
import DelayConfig from "./config/DelayConfig";
import ConditionConfig from "./config/ConditionConfig";

// ============================================
// TYPES
// ============================================

interface WorkflowConfigPanelProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
    onDelete: () => void;
    onClose: () => void;
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
                icon: <span className="text-xl">🔀</span>,
                color: "from-teal-500 to-cyan-600",
                bgColor: "bg-teal-500/10",
                label: "Configure Condition",
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

export default function WorkflowConfigPanel({
    step,
    onUpdate,
    onDelete,
    onClose,
}: WorkflowConfigPanelProps) {
    const [name, setName] = useState(step.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Update name when step changes
    useEffect(() => {
        setName(step.name);
        setShowDeleteConfirm(false);
    }, [step.id, step.name]);

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

                    {/* Step-specific config */}
                    {step.type === "trigger" && (
                        <TriggerConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "action" && (
                        <ActionConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "delay" && (
                        <DelayConfig step={step} onChange={handleConfigChange} />
                    )}
                    {step.type === "condition" && (
                        <ConditionConfig step={step} onChange={handleConfigChange} />
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
