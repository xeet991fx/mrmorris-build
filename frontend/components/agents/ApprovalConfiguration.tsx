'use client';

import { useState, useEffect, useCallback } from 'react';
import { updateAgent } from '@/lib/api/agents';
import {
    IAgentApprovalConfig,
    APPROVABLE_ACTIONS,
    APPROVAL_DEFAULTS,
    ApprovableAction
} from '@/types/agent';
import { toast } from 'sonner';
import {
    ShieldCheckIcon,
    CheckCircleIcon,
    UserGroupIcon,
    EnvelopeIcon,
    MagnifyingGlassIcon,
    ClipboardDocumentCheckIcon,
    TagIcon,
    XMarkIcon,
    PencilIcon,
    UserPlusIcon,
    CurrencyDollarIcon,
    ClockIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { Linkedin } from 'lucide-react';

interface ApprovalConfigurationProps {
    workspaceId: string;
    agentId: string;
    initialApprovalConfig: IAgentApprovalConfig | null;
    onSave?: (approvalConfig: IAgentApprovalConfig) => void;
    disabled?: boolean;
    // Story 1.7 Fix: Props for Live agent warning and optimistic locking
    agentStatus?: 'Draft' | 'Live' | 'Paused';
    expectedUpdatedAt?: string | null;
    onConflict?: (info: { updatedBy: string; updatedAt: string }) => void;
    onUpdateSuccess?: (newUpdatedAt: string) => void;
    onLiveWarningRequired?: () => Promise<boolean>;
}

// Icon mapping for action types
const getActionIcon = (actionId: string) => {
    const iconClass = "w-4 h-4";
    switch (actionId) {
        case 'send_email':
            return <EnvelopeIcon className={iconClass} />;
        case 'linkedin_invite':
            return <Linkedin className={iconClass} />;
        case 'web_search':
            return <MagnifyingGlassIcon className={iconClass} />;
        case 'create_task':
            return <ClipboardDocumentCheckIcon className={iconClass} />;
        case 'add_tag':
            return <TagIcon className={iconClass} />;
        case 'remove_tag':
            return <XMarkIcon className={iconClass} />;
        case 'update_field':
            return <PencilIcon className={iconClass} />;
        case 'enrich_contact':
            return <UserPlusIcon className={iconClass} />;
        case 'update_deal_value':
            return <CurrencyDollarIcon className={iconClass} />;
        case 'wait':
            return <ClockIcon className={iconClass} />;
        default:
            return <CheckCircleIcon className={iconClass} />;
    }
};

export function ApprovalConfiguration({
    workspaceId,
    agentId,
    initialApprovalConfig,
    onSave,
    disabled = false,
    agentStatus,
    expectedUpdatedAt,
    onConflict,
    onUpdateSuccess,
    onLiveWarningRequired
}: ApprovalConfigurationProps) {
    // Initialize with defaults merged with initial values
    const getInitialState = useCallback((): IAgentApprovalConfig => {
        return {
            ...APPROVAL_DEFAULTS,
            ...initialApprovalConfig
        };
    }, [initialApprovalConfig]);

    const [config, setConfig] = useState<IAgentApprovalConfig>(getInitialState);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        setConfig(getInitialState());
        setHasChanges(false);
        setValidationError(null);
    }, [getInitialState]);

    // Validate configuration
    const validateConfig = (): boolean => {
        // If enabled and not requireForAllActions, at least one action must be selected
        if (config.enabled && !config.requireForAllActions && config.requiredForActions.length === 0) {
            setValidationError('At least one action must be selected when approval is enabled for specific actions');
            return false;
        }
        setValidationError(null);
        return true;
    };

    const handleToggleApproval = () => {
        setConfig(prev => ({
            ...prev,
            enabled: !prev.enabled
        }));
        setHasChanges(true);
        setValidationError(null);
    };

    const handleModeChange = (requireForAll: boolean) => {
        setConfig(prev => ({
            ...prev,
            requireForAllActions: requireForAll,
            // Clear selected actions when switching to "all actions" mode
            requiredForActions: requireForAll ? [] : prev.requiredForActions
        }));
        setHasChanges(true);
        setValidationError(null);
    };

    const handleActionToggle = (actionId: ApprovableAction) => {
        setConfig(prev => {
            const newActions = prev.requiredForActions.includes(actionId)
                ? prev.requiredForActions.filter(a => a !== actionId)
                : [...prev.requiredForActions, actionId];
            return {
                ...prev,
                requiredForActions: newActions
            };
        });
        setHasChanges(true);
        setValidationError(null);
    };

    const handleSelectAllActions = () => {
        setConfig(prev => ({
            ...prev,
            requiredForActions: APPROVABLE_ACTIONS.map(a => a.id) as ApprovableAction[]
        }));
        setHasChanges(true);
        setValidationError(null);
    };

    const handleClearAllActions = () => {
        setConfig(prev => ({
            ...prev,
            requiredForActions: []
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!validateConfig()) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        // Story 1.7 Fix: Check for Live agent and show warning
        if (agentStatus === 'Live' && onLiveWarningRequired) {
            const confirmed = await onLiveWarningRequired();
            if (!confirmed) {
                return; // User cancelled
            }
        }

        setIsSaving(true);
        try {
            // Story 1.7 Fix: Include expectedUpdatedAt for optimistic locking
            const saveData: { approvalConfig: IAgentApprovalConfig; expectedUpdatedAt?: string } = { approvalConfig: config };
            if (expectedUpdatedAt) {
                saveData.expectedUpdatedAt = expectedUpdatedAt;
            }

            const response = await updateAgent(workspaceId, agentId, saveData);
            if (response.success) {
                toast.success('Approval configuration saved successfully!');
                setHasChanges(false);
                if (onSave && response.agent.approvalConfig) {
                    onSave(response.agent.approvalConfig);
                }
                // Story 1.7 Fix: Update parent's originalUpdatedAt
                if (response.agent?.updatedAt) {
                    onUpdateSuccess?.(response.agent.updatedAt);
                }
            }
        } catch (error: any) {
            console.error('Error saving approval configuration:', error);

            // Story 1.7 Fix: Handle 409 conflict error
            if (error.response?.status === 409 && error.response?.data?.conflict) {
                onConflict?.(error.response.data.conflict);
                return;
            }

            const details = error.response?.data?.details;
            const errorMessage = error.response?.data?.error || 'Failed to save approval configuration';
            if (details && Array.isArray(details) && details.length > 0) {
                toast.error(`${errorMessage}: ${details.map((d: any) => d.message || d).join(', ')}`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6" data-testid="approval-configuration">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Approvals
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Require human approval for agent actions before execution
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || isSaving || !hasChanges || !!validationError}
                    className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    data-testid="save-approval-button"
                >
                    {isSaving ? 'Saving...' : 'Save Approvals'}
                </button>
            </div>

            {/* Enable Approval Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Require Approval
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Pause agent execution for human review before sensitive actions
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={config.enabled}
                    aria-label="Enable approval requirement"
                    onClick={handleToggleApproval}
                    disabled={disabled || isSaving}
                    data-testid="approval-enabled-toggle"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${config.enabled
                        ? 'bg-zinc-900 dark:bg-white'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Approval Mode & Action Selection - Only show when enabled */}
            {config.enabled && (
                <>
                    {/* Approval Mode Selection */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Approval Mode
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleModeChange(true)}
                                disabled={disabled || isSaving}
                                data-testid="approval-mode-all"
                                className={`p-4 text-left rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${config.requireForAllActions
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                    }`}
                            >
                                <p className="font-medium text-sm">All Actions</p>
                                <p className={`text-xs mt-1 ${config.requireForAllActions ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    Require approval for every action
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeChange(false)}
                                disabled={disabled || isSaving}
                                data-testid="approval-mode-specific"
                                className={`p-4 text-left rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${!config.requireForAllActions
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                    }`}
                            >
                                <p className="font-medium text-sm">Specific Actions</p>
                                <p className={`text-xs mt-1 ${!config.requireForAllActions ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    Choose which actions need approval
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Action Selection - Only show when "Specific Actions" mode */}
                    {!config.requireForAllActions && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Select Actions
                                    </h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Choose actions that require human approval
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllActions}
                                        disabled={disabled || isSaving}
                                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                                    <button
                                        type="button"
                                        onClick={handleClearAllActions}
                                        disabled={disabled || isSaving}
                                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Validation Error */}
                            {validationError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <XCircleIcon className="w-4 h-4 text-red-500" />
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {validationError}
                                    </p>
                                </div>
                            )}

                            {/* Action Checkboxes */}
                            <div className="grid grid-cols-2 gap-2">
                                {APPROVABLE_ACTIONS.map((action) => {
                                    const isChecked = config.requiredForActions.includes(action.id as ApprovableAction);
                                    return (
                                        <button
                                            key={action.id}
                                            type="button"
                                            onClick={() => handleActionToggle(action.id as ApprovableAction)}
                                            disabled={disabled || isSaving}
                                            data-testid={`approval-action-${action.id}`}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isChecked
                                                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-white'
                                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked
                                                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                                                : 'border-zinc-300 dark:border-zinc-600'
                                                }`}>
                                                {isChecked && (
                                                    <svg className="w-3 h-3 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`${isChecked ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                                {getActionIcon(action.id)}
                                            </span>
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {action.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Approvers Section - Placeholder for now */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <UserGroupIcon className="w-4 h-4 text-zinc-500" />
                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Approvers
                            </h4>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                All workspace owners and admins can approve agent actions.
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                                Specific approver selection will be available in a future update.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Disabled State Message */}
            {!config.enabled && (
                <div className="text-center py-8 text-sm text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    Enable approvals to require human review before agent actions execute
                </div>
            )}
        </div>
    );
}
