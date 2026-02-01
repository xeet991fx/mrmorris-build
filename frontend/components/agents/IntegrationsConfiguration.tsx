'use client';

import { useState, useEffect, useCallback } from 'react';
import { updateAgent } from '@/lib/api/agents';
import { getIntegrations, connectIntegration, Integration } from '@/lib/api/integrations';
import { VALID_INTEGRATIONS } from '@/types/agent';
import { toast } from 'sonner';
import { IntegrationStatusCard } from './IntegrationStatusCard';
import { IntegrationAccessToggle } from './IntegrationAccessToggle';
import {
    GlobeAltIcon,
    ExclamationTriangleIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface IntegrationsConfigurationProps {
    workspaceId: string;
    agentId: string;
    initialAllowedIntegrations: string[] | null;
    instructions?: string;
    onSave?: (allowedIntegrations: string[]) => void;
    disabled?: boolean;
    agentStatus?: 'Draft' | 'Live' | 'Paused';
    expectedUpdatedAt?: string | null;
    onConflict?: (info: { updatedBy: string; updatedAt: string }) => void;
    onUpdateSuccess?: (newUpdatedAt: string) => void;
    onLiveWarningRequired?: () => Promise<boolean>;
}

export function IntegrationsConfiguration({
    workspaceId,
    agentId,
    initialAllowedIntegrations,
    instructions = '',
    onSave,
    disabled = false,
    agentStatus,
    expectedUpdatedAt,
    onConflict,
    onUpdateSuccess,
    onLiveWarningRequired
}: IntegrationsConfigurationProps) {
    const [allowedIntegrations, setAllowedIntegrations] = useState<string[]>(
        initialAllowedIntegrations || []
    );
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [allowAll, setAllowAll] = useState(
        !initialAllowedIntegrations || initialAllowedIntegrations.length === 0
    );
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch workspace integrations
    const fetchIntegrations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await getIntegrations(workspaceId);
            if (response.success) {
                setIntegrations(response.data?.integrations || []);
            }
        } catch (error) {
            console.error('Error fetching integrations:', error);
            toast.error('Failed to load integrations');
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    useEffect(() => {
        setAllowedIntegrations(initialAllowedIntegrations || []);
        setAllowAll(!initialAllowedIntegrations || initialAllowedIntegrations.length === 0);
        setHasChanges(false);
    }, [initialAllowedIntegrations]);

    // Detect required integrations from instructions
    const detectRequiredIntegrations = useCallback((text: string): string[] => {
        const required: string[] = [];

        if (/send.*email|gmail|email to/i.test(text)) {
            required.push('gmail');
        }
        if (/linkedin.*invite|connect on linkedin/i.test(text)) {
            required.push('linkedin');
        }
        if (/slack.*message|notify.*slack/i.test(text)) {
            required.push('slack');
        }
        if (/apollo|enrich.*contact/i.test(text)) {
            required.push('apollo');
        }
        if (/calendar|schedule.*meeting/i.test(text)) {
            required.push('google-calendar');
        }
        if (/spreadsheet|google.*sheet/i.test(text)) {
            required.push('google-sheets');
        }

        return required;
    }, []);

    // Get validation warnings
    const getValidationWarnings = useCallback((): string[] => {
        const warnings: string[] = [];
        const required = detectRequiredIntegrations(instructions);

        required.forEach((integrationId) => {
            const credential = integrations.find((c) => c.type === integrationId);
            const isConnected = credential?.status === 'Connected';
            const isAllowedForAgent =
                allowAll || allowedIntegrations.includes(integrationId);

            const integrationName =
                VALID_INTEGRATIONS.find((i) => i.id === integrationId)?.name || integrationId;

            if (!isConnected) {
                warnings.push(
                    `${integrationName} is required by instructions but not connected to workspace`
                );
            } else if (!isAllowedForAgent) {
                warnings.push(
                    `${integrationName} is used in instructions but not allowed for this agent`
                );
            }
        });

        return warnings;
    }, [instructions, integrations, allowAll, allowedIntegrations, detectRequiredIntegrations]);

    const validationWarnings = getValidationWarnings();

    const handleAllowAllChange = (checked: boolean) => {
        setAllowAll(checked);
        if (checked) {
            setAllowedIntegrations([]);
        }
        setHasChanges(true);
    };

    const handleToggleIntegration = (integrationId: string, enabled: boolean) => {
        setAllowAll(false);
        setAllowedIntegrations((prev) => {
            if (enabled) {
                return [...prev, integrationId];
            } else {
                return prev.filter((id) => id !== integrationId);
            }
        });
        setHasChanges(true);
    };

    const handleConnect = async (integrationType: string) => {
        try {
            // Map integration type to OAuth provider
            let provider: 'gmail' | 'linkedin' | 'google-calendar' = 'gmail';
            if (integrationType === 'gmail') provider = 'gmail';
            else if (integrationType === 'linkedin') provider = 'linkedin';
            else if (integrationType === 'google-calendar') provider = 'google-calendar';
            else {
                toast.error(`OAuth connection for ${integrationType} not yet implemented`);
                return;
            }

            const response = await connectIntegration(workspaceId, provider);
            if (response.success && response.data?.authUrl) {
                // Open OAuth popup
                const width = 600;
                const height = 800;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                const popup = window.open(
                    response.data.authUrl,
                    'OAuth Authorization',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Poll for popup closure
                const pollInterval = setInterval(() => {
                    if (!popup || popup.closed) {
                        clearInterval(pollInterval);
                        // Refresh integrations after popup closes
                        fetchIntegrations();
                        toast.success('Integration connected successfully!');
                    }
                }, 500);

                // Cleanup after 5 minutes
                setTimeout(() => {
                    clearInterval(pollInterval);
                    if (popup && !popup.closed) {
                        popup.close();
                    }
                }, 300000);
            } else {
                toast.error(response.error || 'Failed to get authorization URL');
            }
        } catch (error: any) {
            console.error('Error connecting integration:', error);
            toast.error('Failed to connect integration');
        }
    };

    const handleSave = async () => {
        // Check for Live agent warning
        if (agentStatus === 'Live' && onLiveWarningRequired) {
            const confirmed = await onLiveWarningRequired();
            if (!confirmed) {
                return;
            }
        }

        setIsSaving(true);
        try {
            const saveData: {
                restrictions: { allowedIntegrations: string[] };
                expectedUpdatedAt?: string;
            } = {
                restrictions: {
                    allowedIntegrations: allowAll ? [] : allowedIntegrations
                }
            };

            if (expectedUpdatedAt) {
                saveData.expectedUpdatedAt = expectedUpdatedAt;
            }

            const response = await updateAgent(workspaceId, agentId, saveData);
            if (response.success) {
                toast.success('Integration settings saved successfully!');
                setHasChanges(false);
                if (onSave) {
                    onSave(allowAll ? [] : allowedIntegrations);
                }
                if (response.agent?.updatedAt) {
                    onUpdateSuccess?.(response.agent.updatedAt);
                }
            }
        } catch (error: any) {
            console.error('Error saving integration settings:', error);

            // Handle 409 conflict error
            if (error.response?.status === 409 && error.response?.data?.conflict) {
                onConflict?.(error.response.data.conflict);
                return;
            }

            const details = error.response?.data?.details;
            const errorMessage = error.response?.data?.error || 'Failed to save integration settings';
            if (details && Array.isArray(details) && details.length > 0) {
                toast.error(`${errorMessage}: ${details.map((d: any) => d.message || d).join(', ')}`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Get integration credential by type
    const getIntegrationCredential = (integrationId: string): Integration | null => {
        return integrations.find((i) => i.type === integrationId) || null;
    };

    // Check if integration is allowed for this agent
    const isIntegrationAllowed = (integrationId: string): boolean => {
        return allowAll || allowedIntegrations.includes(integrationId);
    };

    return (
        <div className="space-y-6 w-full" data-testid="integrations-configuration">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Integrations
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Configure which integrations this agent can access
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || isSaving || !hasChanges}
                    className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap flex-shrink-0 w-full sm:w-auto justify-center"
                    data-testid="save-integrations-button"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                                Integration Warnings
                            </h4>
                            <ul className="space-y-1">
                                {validationWarnings.map((warning, index) => (
                                    <li
                                        key={index}
                                        className="text-sm text-amber-800 dark:text-amber-200"
                                    >
                                        • {warning}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Workspace Integration Status */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Workspace Integration Status
                    </h4>
                    <Link
                        href={`/projects/${workspaceId}/settings`}
                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 whitespace-nowrap"
                    >
                        Manage all integrations
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {VALID_INTEGRATIONS.map((integration) => (
                            <div
                                key={integration.id}
                                className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-900 animate-pulse"
                            >
                                <div className="h-20"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {VALID_INTEGRATIONS.map((integration) => (
                            <IntegrationStatusCard
                                key={integration.id}
                                integration={integration}
                                credential={getIntegrationCredential(integration.id)}
                                workspaceId={workspaceId}
                                onConnectClick={() => handleConnect(integration.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Agent Integration Access */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4" />
                    Agent Integration Access
                </h4>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Control which integrations this agent can use
                </p>

                {/* Allow All Checkbox */}
                <label className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={allowAll}
                        onChange={(e) => handleAllowAllChange(e.target.checked)}
                        disabled={disabled || isSaving}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Allow all integrations
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Recommended - Agent can use any connected integration
                        </p>
                    </div>
                </label>

                {/* Individual Integration Toggles */}
                {!allowAll && (
                    <div className="space-y-2">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Or select specific integrations:
                        </p>
                        <div className="space-y-2">
                            {VALID_INTEGRATIONS.map((integration) => {
                                const credential = getIntegrationCredential(integration.id);
                                const isConnected = credential?.status === 'Connected';
                                const isAllowed = isIntegrationAllowed(integration.id);

                                return (
                                    <IntegrationAccessToggle
                                        key={integration.id}
                                        integration={integration}
                                        isConnected={isConnected}
                                        isAllowed={isAllowed}
                                        onToggle={handleToggleIntegration}
                                        disabled={disabled || isSaving}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {!allowAll && allowedIntegrations.length === 0 && (
                    <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            No integrations selected. This agent will not be able to use any
                            integrations.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
