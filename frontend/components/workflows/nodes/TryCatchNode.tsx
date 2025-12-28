"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// TRY/CATCH NODE COMPONENT
// ============================================

interface TryCatchNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function TryCatchNode({ data, selected }: NodeProps<TryCatchNodeData>) {
    const { step } = data;
    const hasRetry = step.config.retryOnError || false;
    const maxRetries = step.config.maxRetries || 3;

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400",
                selected && "ring-2 ring-offset-2 ring-amber-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-white !border-2 !border-amber-600"
            />

            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    <ShieldExclamationIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Try/Catch
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{step.name}</p>
                    {hasRetry && (
                        <p className="text-xs text-white/60">
                            Retries: {maxRetries}
                        </p>
                    )}
                </div>
            </div>

            {/* Output handles */}
            <div className="flex gap-2 mt-2">
                {/* Success handle (left) */}
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-white/60 mb-1">Success</span>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="success"
                        style={{ left: '30%' }}
                        className="!w-3 !h-3 !bg-green-400 !border-2 !border-amber-600"
                    />
                </div>

                {/* Error handle (right) */}
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] text-white/60 mb-1">Error</span>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="error"
                        style={{ left: '70%' }}
                        className="!w-3 !h-3 !bg-red-400 !border-2 !border-amber-600"
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(TryCatchNode);
