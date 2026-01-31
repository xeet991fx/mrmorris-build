'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ApplyInstructionsButton from './ApplyInstructionsButton';
import ValidationWarningsList from './ValidationWarningsList';

interface ValidationWarning {
  type: 'missing_template' | 'missing_field' | 'missing_integration' | 'invalid_syntax';
  message: string;
  line: number;
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  warnings?: ValidationWarning[];
  onApplyInstructions?: (instructions: string) => void;
}

export default function ChatMessage({
  role,
  content,
  timestamp,
  warnings = [],
  onApplyInstructions
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Detect if this is a generated workflow (numbered list format)
  const isWorkflow = !role.includes('user') && /^\d+\.\s/.test(content.trim());

  if (role === 'system') {
    return (
      <div className="flex justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {content}
        </p>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              AI Copilot
            </span>
          </div>
        )}

        <div
          className={`rounded-lg p-3 [overflow-wrap:anywhere] ${isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
            }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none [overflow-wrap:anywhere]">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    // In react-markdown v6+, inline is detected from whether the parent is 'pre'
                    const isInline = !match;

                    return !isInline && match ? (
                      <div className="relative group">
                        <button
                          onClick={() => handleCopyCode(codeString)}
                          className="absolute right-2 top-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy code"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <SyntaxHighlighter
                          style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                          language={match[1]}
                          PreTag="div"
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={`${className || ''} break-all`} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Show Apply button for generated workflows */}
        {isWorkflow && onApplyInstructions && (
          <>
            <ApplyInstructionsButton
              generatedInstructions={content}
              onApply={onApplyInstructions}
              warnings={warnings}
            />
            {warnings.length > 0 && (
              <ValidationWarningsList warnings={warnings} />
            )}
          </>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
