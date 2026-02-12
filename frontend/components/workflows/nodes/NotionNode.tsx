"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { WorkflowStep } from "@/lib/workflow/types";
import { getIntegrationMeta } from "@/lib/workflow/integrations";
import { cn } from "@/lib/utils";

// ============================================
// NOTION NODE COMPONENT
// ============================================

interface NotionNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

// Action display names
const ACTION_LABELS: Record<string, string> = {
    create_page: "Create Page",
    update_page: "Update Page",
    query_database: "Query Database",
    retrieve_page: "Retrieve Page",
    archive_page: "Archive Page",
};

function NotionNode({ data, selected }: NodeProps<NotionNodeData>) {
    const { step } = data;
    const action = step.config.action;
    const hasCredentials = !!step.config.credentialId;
    const actionLabel = action ? ACTION_LABELS[action] || action : "Not configured";

    const integrationMeta = getIntegrationMeta("integration_notion");
    const IconComponent = integrationMeta?.icon;

    return (
        <div
            className={cn(
                "relative px-3 py-3 rounded-xl border-2 shadow-xl min-w-[160px] transition-all backdrop-blur-sm",
                "bg-white dark:bg-gray-900",
                "border-black/30 dark:border-white/30 hover:border-black/60 dark:hover:border-white/60",
                selected && "ring-2 ring-offset-2 ring-black dark:ring-white ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-black dark:!bg-white !border-2 !border-white dark:!border-gray-900"
            />

            {/* Node content */}
            <div className="flex items-start gap-3">
                {/* Square App Icon */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md",
                        "bg-gradient-to-br",
                        integrationMeta?.bgColor || "from-[#000000] to-[#2B2B2B]"
                    )}
                >
                    {IconComponent ? (
                        <IconComponent className="w-6 h-6 text-white" />
                    ) : (
                        <img
                            src={`https://logo.clearbit.com/notion.so?size=64`}
                            alt="Notion"
                            className="w-6 h-6"
                            onError={(e) => {
                                // Fallback to Google favicon
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=notion.so&sz=64`;
                            }}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                        {integrationMeta?.name || "Notion"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {actionLabel}
                    </p>
                    {!hasCredentials && (
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
                className="!w-3 !h-3 !bg-black dark:!bg-white !border-2 !border-white dark:!border-gray-900"
            />
        </div>
    );
}

export default memo(NotionNode);
