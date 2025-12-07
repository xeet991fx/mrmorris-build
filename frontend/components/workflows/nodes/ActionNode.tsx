"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
    EnvelopeIcon,
    PencilSquareIcon,
    ClipboardDocumentListIcon,
    UserIcon,
    TagIcon,
    BellIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { WorkflowStep, ACTION_TYPE_LABELS, ActionType } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

// ============================================
// ACTION ICONS
// ============================================

const actionIcons: Record<ActionType, React.ReactNode> = {
    send_email: <EnvelopeIcon className="w-4 h-4" />,
    update_field: <PencilSquareIcon className="w-4 h-4" />,
    create_task: <ClipboardDocumentListIcon className="w-4 h-4" />,
    assign_owner: <UserIcon className="w-4 h-4" />,
    add_tag: <TagIcon className="w-4 h-4" />,
    remove_tag: <TagIcon className="w-4 h-4" />,
    send_notification: <BellIcon className="w-4 h-4" />,
    enroll_workflow: <ArrowPathIcon className="w-4 h-4" />,
};

// ============================================
// ACTION NODE COMPONENT
// ============================================

interface ActionNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
    const { step } = data;
    const actionType = step.config.actionType || "update_field";
    const label = ACTION_TYPE_LABELS[actionType] || "Action";
    const icon = actionIcons[actionType] || <PencilSquareIcon className="w-4 h-4" />;

    // Get additional info based on action type
    let subtitle = "";
    if (actionType === "update_field" && step.config.fieldName) {
        subtitle = step.config.fieldName;
    } else if (actionType === "send_email" && step.config.emailSubject) {
        subtitle = step.config.emailSubject;
    } else if (actionType === "create_task" && step.config.taskTitle) {
        subtitle = step.config.taskTitle;
    } else if (actionType === "add_tag" && step.config.tagName) {
        subtitle = step.config.tagName;
    }

    return (
        <div
            className={cn(
                "px-4 py-3 rounded-lg border-2 shadow-lg min-w-[180px] transition-all",
                "bg-gradient-to-br from-blue-500 to-cyan-600 border-blue-400",
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
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/70 font-medium">
                        Action
                    </p>
                    <p className="text-sm font-semibold text-white truncate">{label}</p>
                    {subtitle && (
                        <p className="text-xs text-white/60 truncate">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-white !border-2 !border-blue-600"
            />
        </div>
    );
}

export default memo(ActionNode);
