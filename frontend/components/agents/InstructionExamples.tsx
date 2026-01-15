'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { LightBulbIcon } from '@heroicons/react/24/solid';

interface InstructionExamplesProps {
    onCopyToEditor?: (text: string) => void;
}

const INSTRUCTION_EXAMPLES = [
    {
        title: 'Simple Email Outreach',
        description: 'Send email to hot leads',
        instructions: `Send email to all contacts tagged "hot lead" using template "Sales Outreach"`
    },
    {
        title: 'Multi-Step Follow-up',
        description: 'Automated follow-up sequence',
        instructions: `1. Find contacts where title contains "CEO"
2. Filter for SaaS industry companies
3. Send personalized email using template "Outbound v2"
4. Wait 5 days
5. If no reply, send follow-up email`
    },
    {
        title: 'Conditional Logic',
        description: 'Different actions based on conditions',
        instructions: `If deal value > $50,000:
  Assign to senior sales rep
  Add tag "enterprise"
  Create task "Schedule discovery call"
Else:
  Assign to sales development rep
  Send automated email template "SMB Outreach"`
    },
    {
        title: 'LinkedIn + Email Combo',
        description: 'Multi-channel outreach',
        instructions: `1. Send LinkedIn invitation with message "Hi @contact.firstName, I'd love to connect"
2. Wait 3 days
3. If invitation accepted:
   Send email using template "LinkedIn Follow-up"
4. If not accepted after 7 days:
   Send email using template "Cold Outreach"
5. Add tag "contacted-linkedin"`
    }
];

export function InstructionExamples({ onCopyToEditor }: InstructionExamplesProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = async (text: string, index: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            onCopyToEditor?.(text);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden" data-testid="instruction-examples-panel">
            {/* Header - Toggle Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                data-testid="instruction-examples-toggle"
            >
                <div className="flex items-center gap-2">
                    <LightBulbIcon className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Instruction Examples
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUpIcon className="w-4 h-4 text-zinc-500" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-zinc-500" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 space-y-4 bg-white dark:bg-zinc-900/30">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Click on any example to copy it to your clipboard, or use as inspiration for your own instructions.
                    </p>

                    <div className="grid gap-3">
                        {INSTRUCTION_EXAMPLES.map((example, index) => (
                            <div
                                key={index}
                                className="group relative border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                            >
                                {/* Example Header */}
                                <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/70">
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                            {example.title}
                                        </h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {example.description}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(example.instructions, index)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-colors"
                                    >
                                        {copiedIndex === index ? (
                                            <>
                                                <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Example Code Block */}
                                <div className="px-3 py-3 bg-zinc-900 dark:bg-black/50 overflow-x-auto">
                                    <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                                        {example.instructions}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
