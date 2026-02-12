"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { AdjustmentsHorizontalIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// TRANSFORM NODE COMPONENT
// ============================================

interface TransformNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

// Transform operation labels
const OPERATION_LABELS: Record<string, string> = {
    transform_set: "Set Variable",
    transform_map: "Map Data",
    transform_filter: "Filter Array",
};

function TransformNode({ data, selected }: NodeProps<TransformNodeData>) {
    const { step } = data;
    const actionType = step.config.actionType || "transform_set";
    const operationLabel = OPERATION_LABELS[actionType] || "Transform";
    const hasOperations = step.config.operations && step.config.operations.length > 0;

    return (
        <div
            className={cn(
                "relative px-3 py-3 rounded-xl border-2 shadow-xl min-w-[160px] transition-all backdrop-blur-sm",
                "bg-white dark:bg-gray-900",
                "border-emerald-500/30 hover:border-emerald-500/60",
                selected && "ring-2 ring-offset-2 ring-emerald-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-gray-900"
            />

            {/* Node content */}
            <div className="flex items-start gap-3">
                {/* Square Transform Icon */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md",
                        "bg-gradient-to-br from-emerald-500 to-teal-600"
                    )}
                >
                    <AdjustmentsHorizontalIcon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                        Transform
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {operationLabel}
                    </p>
                    {!hasOperations && (
                        <p className="text-[9px] text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" /> Not configured
                        </p>
                    )}
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-gray-900"
            />
        </div>
    );
}

export default memo(TransformNode);
