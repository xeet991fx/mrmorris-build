"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { WorkflowStep } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

// ============================================
// HTTP REQUEST NODE COMPONENT
// ============================================

interface HTTPRequestNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

// HTTP method colors
const METHOD_COLORS: Record<string, string> = {
    GET: "#10B981",      // Green
    POST: "#3B82F6",     // Blue
    PUT: "#F59E0B",      // Amber
    DELETE: "#EF4444",   // Red
    PATCH: "#8B5CF6",    // Purple
    HEAD: "#6B7280",     // Gray
};

function HTTPRequestNode({ data, selected }: NodeProps<HTTPRequestNodeData>) {
    const { step } = data;
    const method = step.config.method || "GET";
    const url = step.config.url || "";
    const hasAuth = !!step.config.authentication?.type && step.config.authentication.type !== "none";

    // Extract domain from URL
    const getDomain = (urlString: string): string => {
        try {
            if (!urlString) return "Not configured";
            const url = new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`);
            return url.hostname;
        } catch {
            return urlString.substring(0, 30) + (urlString.length > 30 ? "..." : "");
        }
    };

    const methodColor = METHOD_COLORS[method] || METHOD_COLORS.GET;

    return (
        <div
            className={cn(
                "relative px-3 py-3 rounded-xl border-2 shadow-xl min-w-[180px] transition-all backdrop-blur-sm",
                "bg-white dark:bg-gray-900",
                "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
                selected && "ring-2 ring-offset-2 ring-blue-500 ring-offset-background"
            )}
        >
            {/* Input handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-gray-600 dark:!bg-gray-400 !border-2 !border-white dark:!border-gray-900"
            />

            {/* Node content */}
            <div className="flex items-start gap-3">
                {/* Square API Icon */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md",
                        "bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800"
                    )}
                >
                    <GlobeAltIcon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground truncate">
                            HTTP Request
                        </p>
                        {/* Method badge */}
                        <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                            style={{ backgroundColor: methodColor }}
                        >
                            {method}
                        </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {getDomain(url)}
                    </p>
                    {hasAuth && (
                        <p className="text-[9px] text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                            🔒 Authenticated
                        </p>
                    )}
                    {!url && (
                        <p className="text-[9px] text-red-500 dark:text-red-400 mt-1">
                            ⚠ Not configured
                        </p>
                    )}
                </div>
            </div>

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-gray-600 dark:!bg-gray-400 !border-2 !border-white dark:!border-gray-900"
            />

            {/* Method indicator badge */}
            <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
                style={{ backgroundColor: methodColor }}
            />
        </div>
    );
}

export default memo(HTTPRequestNode);
