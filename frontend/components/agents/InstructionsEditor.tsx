'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { DocumentTextIcon, CheckCircleIcon, ExclamationCircleIcon, ShieldCheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { updateAgent, validateAgentInstructions, reviewAgentInstructions } from '@/lib/api/agents';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ValidationResultsPanel } from './ValidationResultsPanel';
import ReviewSuggestionsPanel from './copilot/ReviewSuggestionsPanel';
import { useInstructionHistory } from '@/hooks/useInstructionHistory';
import type { ValidationResult, ValidationIssue } from '@/types/agent';

// Story 1.3: Character thresholds (mirror backend)
export const INSTRUCTIONS_WARNING_THRESHOLD = 8000;
export const INSTRUCTIONS_MAX_LENGTH = 10000;

interface InstructionsEditorProps {
    agentId: string;
    workspaceId: string;
    initialInstructions: string | null;
    onSave?: (instructions: string) => void;
    disabled?: boolean;
    // Story 1.7 Fix: Props for Live agent warning and optimistic locking
    agentStatus?: 'Draft' | 'Live' | 'Paused';
    expectedUpdatedAt?: string | null;
    onConflict?: (info: { updatedBy: string; updatedAt: string }) => void;
    onUpdateSuccess?: (newUpdatedAt: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function InstructionsEditor({
    agentId,
    workspaceId,
    initialInstructions,
    onSave,
    disabled = false,
    agentStatus,
    expectedUpdatedAt,
    onConflict,
    onUpdateSuccess
}: InstructionsEditorProps) {
    const [instructions, setInstructions] = useState(initialInstructions || '');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [charCount, setCharCount] = useState(initialInstructions?.length || 0);

    // Story 2.4: Validation state
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Story 4.4: Review state (Task 8)
    const [isReviewing, setIsReviewing] = useState(false);
    const [showReviewPanel, setShowReviewPanel] = useState(false);
    const [reviewResults, setReviewResults] = useState<any | null>(null);
    const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

    // Story 4.4: Instruction history for undo (Task 7)
    const { pushVersion, undo, canUndo } = useInstructionHistory(initialInstructions || '');

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
                // Story 1.7 Fix: Include expectedUpdatedAt for optimistic locking
                const saveData: { instructions: string; expectedUpdatedAt?: string } = { instructions: value };
                if (expectedUpdatedAt) {
                    saveData.expectedUpdatedAt = expectedUpdatedAt;
                }

                const response = await updateAgent(workspaceId, agentId, saveData);
                if (response.success) {
                    setSaveStatus('saved');
                    setLastSaved(new Date());
                    onSave?.(value);
                    // Story 1.7 Fix: Update parent's originalUpdatedAt
                    if (response.agent?.updatedAt) {
                        onUpdateSuccess?.(response.agent.updatedAt);
                    }
                } else {
                    setSaveStatus('error');
                    toast.error('Failed to save instructions');
                }
            } catch (error: any) {
                console.error('Error saving instructions:', error);
                setSaveStatus('error');

                // Story 1.7 Fix: Handle 409 conflict error
                if (error.response?.status === 409 && error.response?.data?.conflict) {
                    onConflict?.(error.response.data.conflict);
                    return;
                }

                toast.error(error.response?.data?.error || 'Failed to save instructions');
            }
        },
        2000
    );

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInstructions(value);
        setSaveStatus('idle');
        // Clear validation when instructions change
        setValidationResult(null);
        debouncedSave(value);
    }, [debouncedSave]);

    // Story 2.4: Handle validation
    const handleValidate = useCallback(async () => {
        if (disabled || isValidating) return;

        setIsValidating(true);
        try {
            const response = await validateAgentInstructions(workspaceId, agentId);
            if (response.success) {
                setValidationResult(response.validation);
                if (response.validation.valid && response.validation.warnings.length === 0) {
                    toast.success('Instructions validated successfully');
                } else if (!response.validation.valid) {
                    toast.error(`Validation found ${response.validation.summary.errorCount} error(s)`);
                } else {
                    toast.warning(`Validation found ${response.validation.summary.warningCount} warning(s)`);
                }
            }
        } catch (error: any) {
            console.error('Validation error:', error);
            toast.error(error.response?.data?.error || 'Validation failed');
        } finally {
            setIsValidating(false);
        }
    }, [workspaceId, agentId, disabled, isValidating]);

    // Story 2.4: Handle clicking on a validation issue to scroll to line
    const handleIssueClick = useCallback((issue: ValidationIssue) => {
        if (!issue.lineNumber) return;

        // Find the textarea and scroll to the line
        const textarea = document.querySelector('[data-testid="instructions-textarea"]') as HTMLTextAreaElement;
        if (!textarea) return;

        const lines = instructions.split('\n');
        let charIndex = 0;
        for (let i = 0; i < issue.lineNumber - 1 && i < lines.length; i++) {
            charIndex += lines[i].length + 1; // +1 for newline
        }

        // Focus and set selection
        textarea.focus();
        textarea.setSelectionRange(charIndex, charIndex + (lines[issue.lineNumber - 1]?.length || 0));

        // Scroll into view
        textarea.scrollTop = (issue.lineNumber - 1) * 20; // Approximate line height
    }, [instructions]);

    // Story 4.4: Handle review instructions (Task 8.3)
    // Fixed: Use proper API function with auth instead of raw fetch
    const handleReview = useCallback(async () => {
        if (disabled || isReviewing) return;

        setIsReviewing(true);
        try {
            const response = await reviewAgentInstructions(workspaceId, agentId, instructions);

            if (response.success) {
                setReviewResults(response.data);
                setShowReviewPanel(true);
            }
        } catch (error: any) {
            console.error('Review error:', error);
            toast.error(error.response?.data?.error || error.message || 'Failed to review instructions');
        } finally {
            setIsReviewing(false);
        }
    }, [workspaceId, agentId, instructions, disabled, isReviewing]);

    // Story 4.4: Handle applying a suggestion (Task 7.3, 7.4)
    const handleApplySuggestion = useCallback((suggestionText: string, type: string, index: number) => {
        // Clear any existing undo timer
        if (undoTimer) {
            clearTimeout(undoTimer);
        }

        // Store current version in history before applying
        pushVersion(instructions);

        // Fix Issue #7: Improve apply logic (more intelligent merging)
        let updatedInstructions = instructions;

        // If instructions are empty or very short, replace entirely
        if (instructions.trim().length < 20) {
            updatedInstructions = suggestionText;
        } else {
            // Smart append: Add suggestion as new step or improvement
            // Remove trailing whitespace and ensure proper spacing
            updatedInstructions = instructions.trimEnd() + '\n\n' + suggestionText.trim();
        }

        setInstructions(updatedInstructions);
        debouncedSave(updatedInstructions);

        // Show undo toast (Task 7.4, 7.6)
        let countdown = 5;
        const toastId = toast.success(
            `Suggestion applied. Undo in ${countdown}s`,
            {
                duration: 5000,
                action: {
                    label: 'Undo',
                    onClick: () => {
                        handleUndo();
                        toast.dismiss(toastId);
                    },
                },
            }
        );

        // Clear undo window after 5 seconds (Task 7.6)
        const timer = setTimeout(() => {
            setUndoTimer(null);
        }, 5000);
        setUndoTimer(timer);
    }, [instructions, pushVersion, debouncedSave, undoTimer]);

    // Story 4.4: Handle undo (Task 7.5)
    const handleUndo = useCallback(() => {
        const previousContent = undo();
        if (previousContent !== null) {
            setInstructions(previousContent);
            debouncedSave(previousContent);
            toast.success('Change undone');
        }
    }, [undo, debouncedSave]);

    // Story 4.4: Handle dismissing a suggestion
    const handleDismissSuggestion = useCallback((type: string, index: number) => {
        // Just visual removal - the ReviewSuggestionsPanel handles this internally
        toast.info('Suggestion dismissed');
    }, []);

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

                {/* Save Status and Validate Button */}
                <div className="flex items-center gap-3">
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

                    {/* Story 2.4: Validate Button */}
                    <button
                        type="button"
                        onClick={handleValidate}
                        disabled={disabled || isValidating || !instructions.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isValidating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                Validating...
                            </>
                        ) : (
                            <>
                                <ShieldCheckIcon className="w-4 h-4" />
                                Validate
                            </>
                        )}
                    </button>

                    {/* Story 4.4: Review Button (Task 8.2, 8.3) */}
                    <button
                        type="button"
                        onClick={handleReview}
                        disabled={disabled || isReviewing || !instructions.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="AI-powered review with suggestions (takes up to 8 seconds)"
                    >
                        {isReviewing ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Analyzing (up to 8s)...
                            </>
                        ) : (
                            <>
                                <MagnifyingGlassIcon className="w-4 h-4" />
                                Review Instructions
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Helper Text */}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Describe what this agent should do in plain English. Write step-by-step instructions for automation tasks.
            </p>

            {/* Story 1.7 Fix: Live Agent Warning Banner */}
            {agentStatus === 'Live' && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <ExclamationCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>This agent is Live.</strong> Changes will affect active executions and auto-save immediately.
                    </div>
                </div>
            )}

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

            {/* Story 2.4: Validation Results */}
            {(validationResult || isValidating) && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                        Validation Results
                    </h4>
                    <ValidationResultsPanel
                        validation={validationResult}
                        isLoading={isValidating}
                        onIssueClick={handleIssueClick}
                    />
                </div>
            )}

            {/* Story 4.4: Review Suggestions Panel (Task 8.5) */}
            {showReviewPanel && reviewResults && (
                <ReviewSuggestionsPanel
                    good={reviewResults.good || []}
                    suggestions={reviewResults.suggestions || []}
                    optimizations={reviewResults.optimizations || []}
                    validationWarnings={reviewResults.validationWarnings}
                    onApply={handleApplySuggestion}
                    onDismiss={handleDismissSuggestion}
                    onClose={() => setShowReviewPanel(false)}
                />
            )}
        </div>
    );
}
