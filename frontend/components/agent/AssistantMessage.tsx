"use client";

import { motion } from "framer-motion";
import { AgentMessage } from "@/store/useAgentStore";
import { SparklesIcon } from "@heroicons/react/24/solid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseActionFromResponse } from "@/lib/agent/actionParser";
import ActionCard from "./ActionCard";
import { useParams } from "next/navigation";

interface AssistantMessageProps {
  message: AgentMessage;
  isLatest: boolean;
}

export default function AssistantMessage({ message, isLatest }: AssistantMessageProps) {
  const params = useParams();
  const workspaceId = params?.id as string;

  // Parse action from message content
  const parsedAction = parseActionFromResponse(message.content);

  // Remove action code block from displayed content
  const displayContent = parsedAction
    ? message.content.replace(parsedAction.rawText || '', '').trim()
    : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#9ACD32] to-[#7BA428] flex items-center justify-center">
        <SparklesIcon className="w-5 h-5 text-neutral-900" />
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">MrMorris AI</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.metadata?.actionStatus && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${message.metadata.actionStatus === "completed"
                ? "bg-green-500/20 text-green-600"
                : message.metadata.actionStatus === "failed"
                  ? "bg-red-500/20 text-red-600"
                  : message.metadata.actionStatus === "executing"
                    ? "bg-blue-500/20 text-blue-600"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              {message.metadata.actionStatus}
            </span>
          )}
        </div>
        <div className="bg-muted rounded-lg px-4 py-3 text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Customize markdown rendering
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-muted-foreground/10 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="block bg-muted-foreground/10 p-3 rounded-md overflow-x-auto font-mono text-xs" {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9ACD32] hover:underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* Action card for executable actions */}
        {parsedAction && workspaceId && (
          <ActionCard
            action={parsedAction}
            workspaceId={workspaceId}
            messageId={message.id}
          />
        )}

        {/* Action result display */}
        {message.metadata?.actionResult && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Action Result</div>
            <pre className="text-xs text-foreground overflow-x-auto">
              {JSON.stringify(message.metadata.actionResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}
