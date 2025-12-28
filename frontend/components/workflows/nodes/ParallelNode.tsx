"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// PARALLEL NODE COMPONENT
// ============================================

interface ParallelNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
    const { step } = data;
    const branchCount = step.config.branches?.length || 0;

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400",
                selected && "ring-2 ring-offset-2 ring-blue-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-white !border-2 !border-blue-600"
            />

            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Parallel Split
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{step.name}</p>
                    {branchCount > 0 && (
                        <p className="text-xs text-white/60">
                            {branchCount} {branchCount === 1 ? 'branch' : 'branches'}
                        </p>
                    )}
                </div>
            </div>

            {/* Multiple output handles for parallel branches */}
            {branchCount > 0 && (
                <div className="flex justify-around mt-2 -mb-3">
                    {Array.from({ length: Math.min(branchCount, 4) }).map((_, i) => (
                        <Handle
                            key={i}
                            type="source"
                            position={Position.Bottom}
                            id={`branch-${i}`}
                            style={{
                                left: `${((i + 1) / (Math.min(branchCount, 4) + 1)) * 100}%`,
                                transform: 'translateX(-50%)',
                            }}
                            className="!w-3 !h-3 !bg-white !border-2 !border-blue-600"
                        />
                    ))}
                </div>
            )}

            {/* Default output handle if no branches configured */}
            {branchCount === 0 && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!w-3 !h-3 !bg-white !border-2 !border-blue-600"
                />
            )}
        </div>
    );
}

export default memo(ParallelNode);
