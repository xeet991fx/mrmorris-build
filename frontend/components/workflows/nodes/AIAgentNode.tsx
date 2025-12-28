"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { SparklesIcon } from "@heroicons/react/24/outline";
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

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-violet-500 to-fuchsia-600 border-violet-400",
                selected && "ring-2 ring-offset-2 ring-violet-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-white !border-2 !border-violet-600"
            />

            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    <SparklesIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        AI Agent
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{step.name}</p>
                    <p className="text-xs text-white/60 capitalize">
                        {agentType} • {timeout}
                    </p>
                    {!hasTaskPrompt && (
                        <p className="text-xs text-red-300">
                            ⚠ No task configured
                        </p>
                    )}
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-white !border-2 !border-violet-600"
            />
        </div>
    );
}

export default memo(AIAgentNode);
