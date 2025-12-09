"use client";

import { forwardRef } from "react";
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

const AssistantMessage = forwardRef<HTMLDivElement, AssistantMessageProps>(({ message, isLatest }, ref) => {
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
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="py-6 border-b border-border/50"
    >
      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-full bg-[#9ACD32] flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-4 h-4 text-neutral-900" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-base">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 text-foreground">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 ml-4 list-disc text-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal text-foreground">{children}</ol>,
                li: ({ children }) => <li className="mb-1 text-foreground">{children}</li>,
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm text-foreground" {...props}>
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
            <div className="mt-4">
              <ActionCard
                action={parsedAction}
                workspaceId={workspaceId}
                messageId={message.id}
              />
            </div>
          )}

          {/* Action result display */}
          {message.metadata?.actionResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-2">Result</div>
              <pre className="text-sm text-foreground overflow-x-auto">
                {JSON.stringify(message.metadata.actionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

AssistantMessage.displayName = "AssistantMessage";

export default AssistantMessage;
