"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// LOOP NODE COMPONENT
// ============================================

interface LoopNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
    const { step } = data;
    const sourceArray = step.config.sourceArray || "items";
    const mode = step.config.mode || "sequential";
    const maxIterations = step.config.maxIterations || 1000;

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-purple-500 to-pink-600 border-purple-400",
                selected && "ring-2 ring-offset-2 ring-purple-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-white !border-2 !border-purple-600"
            />

            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    <ArrowPathIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Loop
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{step.name}</p>
                    <p className="text-xs text-white/60">
                        {sourceArray} • {mode}
                    </p>
                    {maxIterations < 1000 && (
                        <p className="text-xs text-white/50">
                            Max: {maxIterations}
                        </p>
                    )}
                </div>
            </div>

            {/* Loop body output (bottom left) and Continue output (bottom right) */}
            <div className="flex gap-2 mt-2">
                {/* Loop body handle */}
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-white/60 mb-1">Loop Body</span>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="loop-body"
                        style={{ left: '30%' }}
                        className="!w-3 !h-3 !bg-purple-200 !border-2 !border-purple-600"
                    />
                </div>

                {/* Exit/Continue handle */}
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-white/60 mb-1">Complete</span>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="complete"
                        style={{ left: '70%' }}
                        className="!w-3 !h-3 !bg-white !border-2 !border-purple-600"
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(LoopNode);
