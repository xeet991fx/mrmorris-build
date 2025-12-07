"use client";

import { XMarkIcon, ExclamationTriangleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { ValidationError } from "@/lib/workflow/validation";
import { cn } from "@/lib/utils";

interface ValidationErrorPanelProps {
    errors: ValidationError[];
    warnings: ValidationError[];
    onClose: () => void;
    onNodeClick?: (nodeId: string) => void;
}

export default function ValidationErrorPanel({
    errors,
    warnings,
    onClose,
    onNodeClick,
}: ValidationErrorPanelProps) {
    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;

    if (!hasErrors && !hasWarnings) {
        return null;
    }

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between px-4 py-3",
                    hasErrors ? "bg-red-500/10" : "bg-yellow-500/10"
                )}>
                    <div className="flex items-center gap-2">
                        {hasErrors ? (
                            <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                        ) : (
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                        )}
                        <span className="font-medium text-foreground">
                            {hasErrors
                                ? `${errors.length} Error${errors.length > 1 ? 's' : ''}`
                                : `${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`
                            }
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Error List */}
                <div className="max-h-48 overflow-y-auto">
                    {errors.map((error) => (
                        <div
                            key={error.id}
                            onClick={() => error.nodeId && onNodeClick?.(error.nodeId)}
                            className={cn(
                                "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0",
                                error.nodeId && "cursor-pointer hover:bg-muted/50"
                            )}
                        >
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground">{error.message}</p>
                                {error.type === 'configuration' && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Click to configure
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {warnings.map((warning) => (
                        <div
                            key={warning.id}
                            onClick={() => warning.nodeId && onNodeClick?.(warning.nodeId)}
                            className={cn(
                                "flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0",
                                warning.nodeId && "cursor-pointer hover:bg-muted/50"
                            )}
                        >
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground">{warning.message}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                {hasErrors && (
                    <div className="px-4 py-2.5 bg-muted/30 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            Fix all errors before activating this workflow
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
