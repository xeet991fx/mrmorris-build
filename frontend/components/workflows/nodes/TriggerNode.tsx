"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { BoltIcon, UserPlusIcon, ArrowPathIcon, EnvelopeOpenIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { WorkflowStep, TRIGGER_TYPE_LABELS, TriggerType } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// TRIGGER ICONS
// ============================================

const triggerIcons: Record<TriggerType, React.ReactNode> = {
    contact_created: <UserPlusIcon className="w-4 h-4" />,
    contact_updated: <ArrowPathIcon className="w-4 h-4" />,
    deal_stage_changed: <ArrowPathIcon className="w-4 h-4" />,
    deal_created: <UserPlusIcon className="w-4 h-4" />,
    email_opened: <EnvelopeOpenIcon className="w-4 h-4" />,
    email_clicked: <EnvelopeOpenIcon className="w-4 h-4" />,
    form_submitted: <UserPlusIcon className="w-4 h-4" />,
    webhook_received: <GlobeAltIcon className="w-4 h-4" />,
    manual: <BoltIcon className="w-4 h-4" />,
};

// ============================================
// TRIGGER NODE COMPONENT
// ============================================

interface TriggerNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
    const { step } = data;
    const triggerType = step.config.triggerType || "manual";
    const label = TRIGGER_TYPE_LABELS[triggerType] || "Trigger";
    const icon = triggerIcons[triggerType] || <BoltIcon className="w-4 h-4" />;

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-violet-500 to-purple-600 border-violet-400",
                selected && "ring-2 ring-offset-2 ring-violet-500 ring-offset-background"
            )}
        >
            {/* Node content */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center text-white">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Trigger
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{label}</p>
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

export default memo(TriggerNode);
