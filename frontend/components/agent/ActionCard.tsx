"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { ParsedAction } from "@/lib/agent/actionParser";
import { executeAction } from "@/lib/agent/actionExecutor";
import { useAgentStore } from "@/store/useAgentStore";
import toast from "react-hot-toast";

interface ActionCardProps {
  action: ParsedAction;
  workspaceId: string;
  messageId: string;
}

export default function ActionCard({ action, workspaceId, messageId }: ActionCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { updateContext, updateMessageAction } = useAgentStore();

  const handleExecute = async () => {
    setIsExecuting(true);

    // Update message action status to executing
    updateMessageAction(messageId, "executing");

    try {
      const actionResult = await executeAction(action, workspaceId);

      setResult(actionResult);
      setExecuted(true);

      if (actionResult.success) {
        toast.success(actionResult.message);

        // Update message action status to completed
        updateMessageAction(messageId, "completed", actionResult);

        // Trigger context update to refresh data
        updateContext({});
      } else {
        toast.error(actionResult.error || actionResult.message);

        // Update message action status to failed
        updateMessageAction(messageId, "failed", actionResult);
      }
    } catch (error: any) {
      toast.error("Failed to execute action");
      const failureResult = {
        success: false,
        message: "Execution failed",
        error: error.message,
      };
      setResult(failureResult);
      setExecuted(true);

      // Update message action status to failed
      updateMessageAction(messageId, "failed", failureResult);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    setExecuted(true);
    const cancelResult = {
      success: false,
      message: "Action cancelled by user",
    };
    setResult(cancelResult);

    // Update message action status to failed (cancelled)
    updateMessageAction(messageId, "failed", cancelResult);

    toast.info("Action cancelled");
  };

  if (executed && result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`mt-3 p-3 rounded-lg border ${
          result.success
            ? "bg-green-500/10 border-green-500/30"
            : "bg-muted border-border"
        }`}
      >
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{result.message}</p>
            {result.error && (
              <p className="text-xs text-destructive mt-1">{result.error}</p>
            )}
            {result.data && (
              <div className="mt-2 text-xs text-muted-foreground">
                <pre className="overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 p-4 rounded-lg border ${
        action.requiresConfirmation
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-[#9ACD32]/10 border-[#9ACD32]/30"
      }`}
    >
      <div className="flex items-start gap-3">
        {action.requiresConfirmation ? (
          <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        ) : (
          <BoltIcon className="w-5 h-5 text-[#9ACD32] flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {action.description}
              </p>
              {action.requiresConfirmation && (
                <p className="text-xs text-orange-600 mt-1">
                  This action requires confirmation
                </p>
              )}

              {/* Show action parameters */}
              {Object.keys(action.parameters).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Parameters:
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {Object.entries(action.parameters).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span className="truncate">
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action.requiresConfirmation
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : "bg-[#9ACD32] hover:bg-[#8AB82E] text-neutral-900"
              }`}
            >
              {isExecuting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Executing...
                </span>
              ) : action.requiresConfirmation ? (
                "Confirm"
              ) : (
                "Execute"
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={isExecuting}
              className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
