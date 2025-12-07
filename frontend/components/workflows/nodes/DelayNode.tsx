"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ClockIcon } from "@heroicons/react/24/outline";
import { WorkflowStep, DELAY_UNIT_LABELS, DelayUnit } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// DELAY NODE COMPONENT
// ============================================

interface DelayNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
    const { step } = data;
    const delayValue = step.config.delayValue || 1;
    const delayUnit = (step.config.delayUnit as DelayUnit) || "days";
    const unitLabel = DELAY_UNIT_LABELS[delayUnit] || "Days";

    // Format the delay text
    const delayText = `${delayValue} ${unitLabel.toLowerCase()}`;

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[160px] transition-all",
                "bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400",
                selected && "ring-2 ring-offset-2 ring-orange-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-white !border-2 !border-orange-600"
            />

            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    <ClockIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Delay
                    </p>
                    <p className="text-sm font-semibold text-white">Wait {delayText}</p>
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-white !border-2 !border-orange-600"
            />
        </div>
    );
}

export default memo(DelayNode);
