'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Play, Pause, Edit, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { updateAgentStatus, validateAgentInstructions } from '@/lib/api/agents';
import { IAgent, AgentStatus, AGENT_STATUS_INFO, ValidationResult } from '@/types/agent';

interface AgentStatusControlsProps {
    agent: IAgent;
    workspaceId: string;
    onStatusChange?: (updatedAgent: IAgent) => void;
    variant?: 'default' | 'compact';
}

export function AgentStatusControls({
    agent,
    workspaceId,
    onStatusChange,
    variant = 'default'
}: AgentStatusControlsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDraftWarning, setShowDraftWarning] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([]);
    // Story 2.4: Validation warnings state
    const [showWarningsConfirmation, setShowWarningsConfirmation] = useState(false);
    const [pendingValidationResult, setPendingValidationResult] = useState<ValidationResult | null>(null);

    const handleStatusChange = async (newStatus: AgentStatus) => {
        // Show warning when changing to Draft from Live or Paused
        if ((agent.status === 'Live' || agent.status === 'Paused') && newStatus === 'Draft') {
            setShowDraftWarning(true);
            return;
        }

        // Story 2.4: Validate before going Live
        if (newStatus === 'Live' && agent.status !== 'Live') {
            await validateBeforeGoLive();
            return;
        }

        await performStatusChange(newStatus);
    };

    // Story 2.4: Validate instructions before going Live
    const validateBeforeGoLive = async () => {
        setIsLoading(true);
        try {
            const response = await validateAgentInstructions(workspaceId, agent._id);

            if (response.success) {
                const { validation } = response;

                // Block if there are errors
                if (validation.errors.length > 0) {
                    setValidationErrors(validation.errors.map(e => ({
                        field: 'instructions',
                        message: e.message
                    })));
                    setShowValidationErrors(true);
                    return;
                }

                // Show warning confirmation if there are warnings
                if (validation.warnings.length > 0) {
                    setPendingValidationResult(validation);
                    setShowWarningsConfirmation(true);
                    return;
                }

                // No errors or warnings, proceed to Live
                await performStatusChange('Live');
            }
        } catch (err: any) {
            // If validation fails, try to go live anyway (backend will validate)
            console.error('Validation check failed:', err);
            await performStatusChange('Live');
        } finally {
            setIsLoading(false);
        }
    };

    // Story 2.4: Confirm going Live with warnings
    const confirmGoLiveWithWarnings = async () => {
        setShowWarningsConfirmation(false);
        setPendingValidationResult(null);
        await performStatusChange('Live');
    };

    const performStatusChange = async (newStatus: AgentStatus) => {
        setIsLoading(true);
        setValidationErrors([]);

        try {
            const response = await updateAgentStatus(workspaceId, agent._id, { status: newStatus });

            const statusInfo = AGENT_STATUS_INFO[newStatus];
            toast.success(`Agent status changed to ${statusInfo.label}`);
            onStatusChange?.(response.agent);
        } catch (err: any) {
            if (err.validationErrors) {
                setValidationErrors(err.validationErrors);
                setShowValidationErrors(true);
            } else {
                toast.error(err.message || 'Failed to update agent status');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDraftChange = async () => {
        setShowDraftWarning(false);
        await performStatusChange('Draft');
    };

    const renderStatusButton = () => {
        const { status } = agent;

        // Pill button base styles
        const pillBase = "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all disabled:opacity-50";
        const primaryPill = `${pillBase} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`;
        const warningPill = `${pillBase} bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400`;
        const ghostPill = `${pillBase} text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800`;

        if (status === 'Draft') {
            return (
                <button
                    onClick={() => handleStatusChange('Live')}
                    disabled={isLoading}
                    data-testid="go-live-button"
                    className={primaryPill}
                >
                    {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Play className="h-3 w-3" />
                    )}
                    Go Live
                </button>
            );
        }

        if (status === 'Live') {
            return (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => handleStatusChange('Paused')}
                        disabled={isLoading}
                        data-testid="pause-button"
                        className={warningPill}
                    >
                        {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Pause className="h-3 w-3" />
                        )}
                        Pause
                    </button>
                    <button
                        onClick={() => handleStatusChange('Draft')}
                        disabled={isLoading}
                        data-testid="set-draft-button"
                        className={ghostPill}
                    >
                        <Edit className="h-3 w-3" />
                        Draft
                    </button>
                </div>
            );
        }

        if (status === 'Paused') {
            return (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => handleStatusChange('Live')}
                        disabled={isLoading}
                        data-testid="resume-button"
                        className={primaryPill}
                    >
                        {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Play className="h-3 w-3" />
                        )}
                        Resume
                    </button>
                    <button
                        onClick={() => handleStatusChange('Draft')}
                        disabled={isLoading}
                        data-testid="set-draft-button-paused"
                        className={ghostPill}
                    >
                        <Edit className="h-3 w-3" />
                        Draft
                    </button>
                </div>
            );
        }

        return null;
    };

    return (
        <>
            {renderStatusButton()}

            {/* Draft Warning Dialog */}
            <Dialog open={showDraftWarning} onOpenChange={setShowDraftWarning}>
                <DialogContent data-testid="draft-warning-dialog">
                    <DialogHeader>
                        <DialogTitle>Change to Draft Status?</DialogTitle>
                        <DialogDescription>
                            Changing to Draft will stop all automatic executions. Scheduled triggers
                            will no longer run and event-based triggers will be disabled.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDraftWarning(false)}
                            data-testid="cancel-draft-change"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDraftChange}
                            data-testid="confirm-draft-change"
                        >
                            Change to Draft
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Validation Errors Dialog */}
            <Dialog open={showValidationErrors} onOpenChange={setShowValidationErrors}>
                <DialogContent data-testid="validation-errors-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Cannot Activate Agent
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3">
                                <p>The following issues must be fixed before going Live:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {validationErrors.map((error, index) => (
                                        <li key={index} className="text-red-600">
                                            {error.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            onClick={() => setShowValidationErrors(false)}
                            data-testid="close-validation-errors"
                        >
                            OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Story 2.4: Validation Warnings Confirmation Dialog (AC8) */}
            <Dialog open={showWarningsConfirmation} onOpenChange={setShowWarningsConfirmation}>
                <DialogContent data-testid="validation-warnings-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Validation Warnings
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    Agent has {pendingValidationResult?.summary.warningCount || 0} warning
                                    {(pendingValidationResult?.summary.warningCount || 0) !== 1 ? 's' : ''}.
                                    Review warnings before going live.
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm max-h-48 overflow-y-auto">
                                    {pendingValidationResult?.warnings.map((warning, index) => (
                                        <li key={index} className="text-yellow-600 dark:text-yellow-400">
                                            {warning.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowWarningsConfirmation(false);
                                setPendingValidationResult(null);
                            }}
                            data-testid="review-warnings"
                        >
                            Review Warnings
                        </Button>
                        <Button
                            onClick={confirmGoLiveWithWarnings}
                            disabled={isLoading}
                            data-testid="go-live-anyway"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Go Live Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
