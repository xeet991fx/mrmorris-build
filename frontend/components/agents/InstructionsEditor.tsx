'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { DocumentTextIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { updateAgent } from '@/lib/api/agents';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Story 1.3: Character thresholds (mirror backend)
export const INSTRUCTIONS_WARNING_THRESHOLD = 8000;
export const INSTRUCTIONS_MAX_LENGTH = 10000;

interface InstructionsEditorProps {
    agentId: string;
    workspaceId: string;
    initialInstructions: string | null;
    onSave?: (instructions: string) => void;
    disabled?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function InstructionsEditor({
    agentId,
    workspaceId,
    initialInstructions,
    onSave,
    disabled = false
}: InstructionsEditorProps) {
    const [instructions, setInstructions] = useState(initialInstructions || '');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [charCount, setCharCount] = useState(initialInstructions?.length || 0);

    // Update char count when instructions change
    useEffect(() => {
        setCharCount(instructions.length);
    }, [instructions]);

    // Debounced auto-save (2 second delay)
    const debouncedSave = useDebouncedCallback(
        async (value: string) => {
            if (disabled) return;

            // Story 1.3 Fix: Don't attempt save if over character limit
            if (value.length > INSTRUCTIONS_MAX_LENGTH) {
                setSaveStatus('error');
                return;
            }

            setSaveStatus('saving');
            try {
                const response = await updateAgent(workspaceId, agentId, { instructions: value });
                if (response.success) {
                    setSaveStatus('saved');
                    setLastSaved(new Date());
                    onSave?.(value);
                } else {
                    setSaveStatus('error');
                    toast.error('Failed to save instructions');
                }
            } catch (error: any) {
                console.error('Error saving instructions:', error);
                setSaveStatus('error');
                toast.error(error.response?.data?.error || 'Failed to save instructions');
            }
        },
        2000
    );

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInstructions(value);
        setSaveStatus('idle');
        debouncedSave(value);
    }, [debouncedSave]);

    // Determine character count styling
    const getCharCountStyles = () => {
        if (charCount > INSTRUCTIONS_MAX_LENGTH) {
            return 'text-red-500 dark:text-red-400';
        }
        if (charCount > INSTRUCTIONS_WARNING_THRESHOLD) {
            return 'text-yellow-600 dark:text-yellow-400';
        }
        return 'text-zinc-400';
    };

    // Determine textarea border styling
    const getTextareaBorderStyles = () => {
        if (charCount > INSTRUCTIONS_MAX_LENGTH) {
            return 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500';
        }
        if (charCount > INSTRUCTIONS_WARNING_THRESHOLD) {
            return 'border-yellow-300 dark:border-yellow-600 focus:ring-yellow-500 focus:border-yellow-500';
        }
        return 'border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500 focus:border-emerald-500';
    };

    return (
        <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Instructions
                    </h3>
                </div>

                {/* Save Status Indicator */}
                <div className="flex items-center gap-2 text-xs">
                    {saveStatus === 'saving' && (
                        <span className="flex items-center gap-1.5 text-zinc-400">
                            <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </span>
                    )}
                    {saveStatus === 'saved' && lastSaved && (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <CheckCircleIcon className="w-4 h-4" />
                            Saved {formatDistanceToNow(lastSaved, { addSuffix: false })} ago
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="flex items-center gap-1.5 text-red-500">
                            <ExclamationCircleIcon className="w-4 h-4" />
                            Error saving
                        </span>
                    )}
                </div>
            </div>

            {/* Helper Text */}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Describe what this agent should do in plain English. Write step-by-step instructions for automation tasks.
            </p>

            {/* Textarea */}
            <div className="relative">
                <textarea
                    value={instructions}
                    onChange={handleChange}
                    disabled={disabled}
                    data-testid="instructions-textarea"
                    placeholder={`Example instructions:
1. Find contacts where title contains "CEO"
2. Filter for SaaS industry companies
3. Send personalized email using template "Outbound v2"
4. Wait 5 days
5. If no reply, send follow-up email`}
                    className={`w-full min-h-[300px] p-4 text-sm font-mono bg-white dark:bg-zinc-900/50 border rounded-lg resize-y transition-colors
            placeholder:text-zinc-400 dark:placeholder:text-zinc-600
            text-zinc-900 dark:text-zinc-100
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getTextareaBorderStyles()}`}
                    style={{ whiteSpace: 'pre-wrap' }}
                />

                {/* Character Count */}
                <div className={`absolute bottom-3 right-3 text-xs ${getCharCountStyles()}`}>
                    {charCount.toLocaleString()} / {INSTRUCTIONS_MAX_LENGTH.toLocaleString()}
                </div>
            </div>

            {/* Warning Messages */}
            {charCount > INSTRUCTIONS_MAX_LENGTH && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                        <strong>Character limit exceeded.</strong> Instructions cannot exceed {INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters.
                        Please shorten your instructions or consider breaking them into multiple agents.
                    </div>
                </div>
            )}

            {charCount > INSTRUCTIONS_WARNING_THRESHOLD && charCount <= INSTRUCTIONS_MAX_LENGTH && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <ExclamationCircleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>Instructions are getting long.</strong> Consider breaking into multiple agents for better maintainability.
                    </div>
                </div>
            )}
        </div>
    );
}
