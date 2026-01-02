"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GiArtificialIntelligence } from "react-icons/gi";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// AI AGENT NODE COMPONENT
// ============================================

interface AIAgentNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function AIAgentNode({ data, selected }: NodeProps<AIAgentNodeData>) {
    const { step } = data;
    const agentType = step.config.agentType || "auto";
    const hasTaskPrompt = !!step.config.taskPrompt;
    const timeout = step.config.timeout ? `${step.config.timeout / 1000}s` : "60s";

    // Agent type labels
    const agentTypeLabels: Record<string, string> = {
        auto: "Auto",
        contact: "Contact",
        email: "Email",
        deal: "Deal",
        task: "Task",
        workflow: "Workflow",
        general: "General",
    };

    return (
        <div
            className={cn(
                "relative px-3 py-3 rounded-xl border-2 shadow-xl min-w-[160px] transition-all backdrop-blur-sm",
                "bg-white dark:bg-gray-900",
                "border-gray-800/30 dark:border-gray-700/50 hover:border-gray-800/60 dark:hover:border-gray-600",
                selected && "ring-2 ring-offset-2 ring-gray-800 dark:ring-gray-600 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-gray-800 dark:!bg-gray-700 !border-2 !border-white dark:!border-gray-900"
            />

            {/* Node content */}
            <div className="flex items-start gap-3">
                {/* Square Robot Icon */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md",
                        "bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800"
                    )}
                >
                    <GiArtificialIntelligence className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                        AI Agent
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 capitalize">
                        {agentTypeLabels[agentType] || agentType} • {timeout}
                    </p>
                    {!hasTaskPrompt && (
                        <p className="text-[9px] text-red-500 dark:text-red-400 mt-1">
                            ⚠ Not configured
                        </p>
                    )}
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-gray-800 dark:!bg-gray-700 !border-2 !border-white dark:!border-gray-900"
            />
        </div>
    );
}

export default memo(AIAgentNode);
