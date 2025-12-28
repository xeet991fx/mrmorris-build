"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// MERGE NODE COMPONENT
// ============================================

interface MergeNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function MergeNode({ data, selected }: NodeProps<MergeNodeData>) {
    const { step } = data;
    const aggregatesResults = step.config.aggregateResults || false;

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400",
                selected && "ring-2 ring-offset-2 ring-cyan-500 ring-offset-background"
            )}
        >
            {/* Multiple input handles for merging */}
            <div className="flex justify-around -mt-3 mb-2">
                {[0, 1, 2, 3].map((i) => (
                    <Handle
                        key={i}
                        type="target"
                        position={Position.Top}
                        id={`input-${i}`}
                        style={{
                            left: `${((i + 1) / 5) * 100}%`,
                            transform: 'translateX(-50%)',
                        }}
                        className="!w-3 !h-3 !bg-white !border-2 !border-cyan-600"
                    />
                ))}
            </div>

            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    <FunnelIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Merge
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{step.name}</p>
                    {aggregatesResults && (
                        <p className="text-xs text-white/60">
                            Aggregates results
                        </p>
                    )}
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-white !border-2 !border-cyan-600"
            />
        </div>
    );
}

export default memo(MergeNode);
