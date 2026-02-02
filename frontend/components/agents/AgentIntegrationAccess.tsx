'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { GlobeAltIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { PlugZap } from 'lucide-react';
import { updateAgent } from '@/lib/api/agents';
import { getIntegrations, Integration } from '@/lib/api/integrations';
import { VALID_INTEGRATIONS } from '@/types/agent';
import { toast } from 'sonner';
import {
    SiGmail,
    SiLinkedin,
    SiSlack,
    SiGooglesheets,
    SiGooglecalendar,
} from 'react-icons/si';

interface AgentIntegrationAccessProps {
    workspaceId: string;
    agentId: string;
    initialAllowedIntegrations: string[] | null;
    onSave?: (allowedIntegrations: string[]) => void;
    disabled?: boolean;
    onOpenModal?: () => void;
}

const mapIntegrationIdToBackendType = (frontendId: string): string => {
    const mapping: Record<string, string> = {
        'google-calendar': 'calendar',
        'google-sheets': 'google_sheets',
    };
    return mapping[frontendId] || frontendId;
};

export function AgentIntegrationAccess({
    workspaceId,
    agentId,
    initialAllowedIntegrations,
    onSave,
    disabled = false,
    onOpenModal,
}: AgentIntegrationAccessProps) {
    const [allowedIntegrations, setAllowedIntegrations] = useState<string[]>(
        initialAllowedIntegrations || []
    );
    const [allowAll, setAllowAll] = useState(
        !initialAllowedIntegrations || initialAllowedIntegrations.length === 0
    );
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch workspace integrations
    useEffect(() => {
        const fetchIntegrations = async () => {
            try {
                setIsLoading(true);
                const response = await getIntegrations(workspaceId);
                if (response.success) {
                    setIntegrations(response.data?.integrations || []);
                }
            } catch (error) {
                console.error('Error fetching integrations:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchIntegrations();
    }, [workspaceId]);

    // Reset state when initial value changes
    useEffect(() => {
        setAllowedIntegrations(initialAllowedIntegrations || []);
        setAllowAll(!initialAllowedIntegrations || initialAllowedIntegrations.length === 0);
        setHasChanges(false);
    }, [initialAllowedIntegrations]);

    // Get integration credential by type
    const getIntegrationCredential = (integrationId: string): Integration | null => {
        const backendType = mapIntegrationIdToBackendType(integrationId);
        return integrations.find((i) => i.type === backendType) || null;
    };

    // Get integration icon
    const getIntegrationIcon = (iconName: string) => {
        const iconClass = "w-5 h-5";
        switch (iconName) {
            case 'mail':
                return <SiGmail className={iconClass} style={{ color: '#EA4335' }} />;
            case 'linkedin':
                return <SiLinkedin className={iconClass} style={{ color: '#0A66C2' }} />;
            case 'slack':
                return <SiSlack className={iconClass} style={{ color: '#4A154B' }} />;
            case 'database':
                return (
                    <svg className={iconClass} fill="url(#apolloGradient)" viewBox="0 0 24 24">
                        <defs>
                            <linearGradient id="apolloGradient-access" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>
                        <path d="M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4zm0 2c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3zm0 16c-4.42 0-8-1.34-8-3v-2.3c1.87 1.24 4.77 2.05 8 2.05s6.13-.81 8-2.05V18c0 1.66-3.58 3-8 3zm0-6c-4.42 0-8-1.34-8-3V8.7c1.87 1.24 4.77 2.05 8 2.05s6.13-.81 8-2.05V12c0 1.66-3.58 3-8 3z" />
                    </svg>
                );
            case 'calendar':
                return <SiGooglecalendar className={iconClass} style={{ color: '#4285F4' }} />;
            case 'table':
                return <SiGooglesheets className={iconClass} style={{ color: '#0F9D58' }} />;
            default:
                return <GlobeAltIcon className={iconClass + " text-zinc-400"} />;
        }
    };

    // Handle "Allow All" toggle
    const handleAllowAllChange = (checked: boolean) => {
        setAllowAll(checked);
        if (checked) {
            setAllowedIntegrations([]);
        }
        setHasChanges(true);
    };

    // Handle individual integration toggle
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

    // Check if integration is allowed for agent
    const isIntegrationAllowed = (integrationId: string): boolean => {
        return allowAll || allowedIntegrations.includes(integrationId);
    };

    // Save changes
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await updateAgent(workspaceId, agentId, {
                restrictions: {
                    allowedIntegrations: allowAll ? [] : allowedIntegrations
                }
            });

            if (response.success) {
                toast.success('Integration access updated!');
                setHasChanges(false);
                if (onSave) {
                    onSave(allowAll ? [] : allowedIntegrations);
                }
            }
        } catch (error: any) {
            console.error('Error saving integration access:', error);
            toast.error('Failed to update integration access');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Collapsible Header */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 flex-1 text-left group"
                >
                    <PlugZap className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                        Agent Integration Access
                    </h3>
                    {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                    ) : (
                        <ChevronDownIcon className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                    )}
                    {hasChanges && !isExpanded && (
                        <span className="ml-2 w-2 h-2 bg-amber-500 rounded-full" />
                    )}
                </button>
                {isExpanded && hasChanges && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={disabled || isSaving}
                        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                )}
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {/* Description and Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Control which integrations this agent can access
                        </p>
                        {onOpenModal && (
                            <button
                                type="button"
                                onClick={onOpenModal}
                                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap"
                            >
                                Manage workspace integrations
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Allow All Toggle */}
                    <label className="flex items-center gap-3 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                        <Switch
                            checked={allowAll}
                            onChange={handleAllowAllChange}
                            disabled={disabled}
                            className={`${
                                allowAll ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'
                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50`}
                        >
                            <span
                                className={`${
                                    allowAll ? 'translate-x-6' : 'translate-x-1'
                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </Switch>
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
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Or select specific integrations:
                            </p>

                            {isLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {VALID_INTEGRATIONS.map((integration) => {
                                        const credential = getIntegrationCredential(integration.id);
                                        const isConnected = credential?.status === 'Connected';
                                        const isAllowed = isIntegrationAllowed(integration.id);

                                        return (
                                            <div
                                                key={integration.id}
                                                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                                    isConnected
                                                        ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-60'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-lg flex items-center justify-center">
                                                        {getIntegrationIcon(integration.icon)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                            {integration.name}
                                                        </p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {isConnected ? (
                                                                <span className="text-green-600 dark:text-green-400">Connected</span>
                                                            ) : (
                                                                'Not connected'
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={isAllowed}
                                                    onChange={(checked) => handleToggleIntegration(integration.id, checked)}
                                                    disabled={disabled || !isConnected}
                                                    className={`${
                                                        isAllowed ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'
                                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    <span
                                                        className={`${
                                                            isAllowed ? 'translate-x-6' : 'translate-x-1'
                                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                                    />
                                                </Switch>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* No integrations selected warning */}
                            {!allowAll && allowedIntegrations.length === 0 && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        ⚠️ No integrations selected. This agent will not be able to use any integrations.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
