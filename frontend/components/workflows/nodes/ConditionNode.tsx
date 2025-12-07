"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { WorkflowNodeData } from "@/lib/workflow/types";

function ConditionNode({ data, selected }: NodeProps<WorkflowNodeData>) {
    const { step } = data;
    const config = step.config.conditions?.[0];

    const getConditionLabel = () => {
        if (!config) return "Configure condition";
        return `${config.field} ${config.operator} ${config.value || "..."}`;
    };

    return (
        <div
            className={cn(
                "relative group transition-all duration-200",
                selected && "drop-shadow-2xl"
            )}
            onClick={() => data.onConfigure?.(step.id)}
        >
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white dark:!border-gray-900"
            />

            {/* Diamond Shape Container */}
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Diamond Background */}
                <div
                    className={cn(
                        "absolute w-32 h-32 rotate-45 rounded-lg transition-all duration-200",
                        "bg-gradient-to-br from-teal-500 via-cyan-500 to-cyan-600",
                        "shadow-lg",
                        selected && "shadow-teal-500/50 scale-110"
                    )}
                />

                {/* Content overlay (counter-rotated to keep text upright) */}
                <div className="relative z-10 text-center px-4 max-w-[140px]">
                    <div className="flex flex-col items-center gap-2">
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-white text-lg">?</span>
                        </div>

                        {/* Step Name */}
                        <div className="text-sm font-semibold text-white line-clamp-1">
                            {step.name}
                        </div>

                        {/* Condition Label */}
                        <div className="text-xs text-white/90 line-clamp-2">
                            {getConditionLabel()}
                        </div>
                    </div>
                </div>

                {/* Hover overlay */}
                <div
                    className={cn(
                        "absolute inset-0 w-32 h-32 rotate-45 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
                        "bg-gradient-to-br from-white/10 to-transparent"
                    )}
                />
            </div>

            {/* Yes Output Handle - Right side */}
            <div
                className="absolute flex items-center"
                style={{ right: '-45px', top: '50%', transform: 'translateY(-50%)' }}
            >
                <Handle
                    type="source"
                    position={Position.Right}
                    id="yes"
                    className="!relative !transform-none !w-4 !h-4 !bg-green-500 !border-2 !border-white dark:!border-gray-900"
                />
                <span className="ml-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full shadow-sm">
                    Yes
                </span>
            </div>

            {/* No Output Handle - Bottom */}
            <div
                className="absolute flex flex-col items-center"
                style={{ bottom: '-35px', left: '50%', transform: 'translateX(-50%)' }}
            >
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="no"
                    className="!relative !transform-none !w-4 !h-4 !bg-red-500 !border-2 !border-white dark:!border-gray-900"
                />
                <span className="mt-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full shadow-sm">
                    No
                </span>
            </div>

            {/* Delete button (on hover) */}
            {data.onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onDelete?.(step.id);
                    }}
                    className={cn(
                        "absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "flex items-center justify-center text-xs hover:bg-red-600 z-20"
                    )}
                    title="Delete node"
                >
                    ×
                </button>
            )}
        </div>
    );
}

export default memo(ConditionNode);
