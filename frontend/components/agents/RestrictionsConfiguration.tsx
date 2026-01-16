'use client';

import { useState, useEffect, useCallback } from 'react';
import { updateAgent } from '@/lib/api/agents';
import {
    IAgentRestrictions,
    VALID_INTEGRATIONS,
    RESTRICTIONS_DEFAULTS,
    RESTRICTIONS_LIMITS,
    GUARDRAILS_MAX_LENGTH
} from '@/types/agent';
import { toast } from 'sonner';
import {
    EnvelopeIcon,
    BoltIcon,
    CheckIcon,
    XMarkIcon,
    GlobeAltIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface RestrictionsConfigurationProps {
    workspaceId: string;
    agentId: string;
    initialRestrictions: IAgentRestrictions | null;
    onSave?: (restrictions: IAgentRestrictions) => void;
    disabled?: boolean;
}

export function RestrictionsConfiguration({
    workspaceId,
    agentId,
    initialRestrictions,
    onSave,
    disabled = false
}: RestrictionsConfigurationProps) {
    // Initialize with defaults merged with initial values
    const getInitialState = useCallback(() => {
        return {
            ...RESTRICTIONS_DEFAULTS,
            ...initialRestrictions
        };
    }, [initialRestrictions]);

    const [restrictions, setRestrictions] = useState<IAgentRestrictions>(getInitialState);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newDomain, setNewDomain] = useState('');

    useEffect(() => {
        setRestrictions(getInitialState());
        setHasChanges(false);
    }, [getInitialState]);

    // Validation
    const validateField = (field: string, value: number): string | null => {
        const limits = RESTRICTIONS_LIMITS[field as keyof typeof RESTRICTIONS_LIMITS];
        if (!limits) return null;

        if (!Number.isInteger(value)) {
            return 'Must be a whole number';
        }
        if (value < limits.min) {
            return `Must be at least ${limits.min}`;
        }
        if (value > limits.max) {
            return `Cannot exceed ${limits.max}`;
        }
        return null;
    };

    const handleNumberChange = (field: 'maxExecutionsPerDay' | 'maxEmailsPerDay', value: string) => {
        // Allow empty string while typing - will validate on save
        if (value === '') {
            setErrors(prev => ({
                ...prev,
                [field]: 'Required'
            }));
            setRestrictions(prev => ({
                ...prev,
                [field]: RESTRICTIONS_LIMITS[field].min  // Use min value as fallback
            }));
            setHasChanges(true);
            return;
        }

        const numValue = parseInt(value, 10);
        const finalValue = isNaN(numValue) ? RESTRICTIONS_LIMITS[field].min : numValue;

        const error = validateField(field, finalValue);
        setErrors(prev => ({
            ...prev,
            [field]: error || ''
        }));

        setRestrictions(prev => ({
            ...prev,
            [field]: finalValue
        }));
        setHasChanges(true);
    };

    const handleIntegrationToggle = (integrationId: string) => {
        setRestrictions(prev => {
            const current = prev.allowedIntegrations || [];
            const isSelected = current.includes(integrationId);

            return {
                ...prev,
                allowedIntegrations: isSelected
                    ? current.filter(id => id !== integrationId)
                    : [...current, integrationId]
            };
        });
        setHasChanges(true);
    };

    const handleSelectAllIntegrations = () => {
        setRestrictions(prev => ({
            ...prev,
            allowedIntegrations: VALID_INTEGRATIONS.map(i => i.id)
        }));
        setHasChanges(true);
    };

    const handleClearAllIntegrations = () => {
        setRestrictions(prev => ({
            ...prev,
            allowedIntegrations: []
        }));
        setHasChanges(true);
    };

    const handleAddDomain = () => {
        const domain = newDomain.trim().toLowerCase();
        if (!domain) return;

        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+$/;
        if (!domainRegex.test(domain)) {
            toast.error('Invalid domain format. Example: example.com');
            return;
        }

        if (restrictions.excludedDomains.includes(domain)) {
            toast.error('Domain already added');
            return;
        }

        setRestrictions(prev => ({
            ...prev,
            excludedDomains: [...prev.excludedDomains, domain]
        }));
        setNewDomain('');
        setHasChanges(true);
    };

    const handleRemoveDomain = (domain: string) => {
        setRestrictions(prev => ({
            ...prev,
            excludedDomains: prev.excludedDomains.filter(d => d !== domain)
        }));
        setHasChanges(true);
    };

    const handleResetToDefaults = () => {
        setRestrictions(RESTRICTIONS_DEFAULTS);
        setErrors({});
        setHasChanges(true);
    };

    const handleSave = async () => {
        // Validate before saving
        const newErrors: Record<string, string> = {};
        const execError = validateField('maxExecutionsPerDay', restrictions.maxExecutionsPerDay);
        const emailError = validateField('maxEmailsPerDay', restrictions.maxEmailsPerDay);

        if (execError) newErrors.maxExecutionsPerDay = execError;
        if (emailError) newErrors.maxEmailsPerDay = emailError;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fix validation errors before saving');
            return;
        }

        setIsSaving(true);
        try {
            const response = await updateAgent(workspaceId, agentId, { restrictions });
            if (response.success) {
                toast.success('Restrictions saved successfully!');
                setHasChanges(false);
                if (onSave && response.agent.restrictions) {
                    onSave(response.agent.restrictions);
                }
            }
        } catch (error: any) {
            console.error('Error saving restrictions:', error);
            toast.error(error.response?.data?.error || 'Failed to save restrictions');
        } finally {
            setIsSaving(false);
        }
    };

    const getIntegrationIcon = (iconName: string) => {
        // Simple icon mapping - in a real app, you'd use actual integration icons
        switch (iconName) {
            case 'mail':
                return <EnvelopeIcon className="w-4 h-4" />;
            case 'linkedin':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                );
            case 'slack':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                );
            default:
                return <GlobeAltIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6" data-testid="restrictions-configuration">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Restrictions
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Set limits and controls on agent behavior
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleResetToDefaults}
                        disabled={disabled || isSaving}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
                        data-testid="reset-restrictions-button"
                    >
                        Reset to Defaults
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={disabled || isSaving || !hasChanges || Object.values(errors).some(e => e)}
                        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        data-testid="save-restrictions-button"
                    >
                        {isSaving ? 'Saving...' : 'Save Restrictions'}
                    </button>
                </div>
            </div>

            {/* Rate Limits Section */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <BoltIcon className="w-4 h-4" />
                    Rate Limits
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Max Executions Per Day */}
                    <div className="space-y-2">
                        <label htmlFor="maxExecutionsPerDay" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Max Executions Per Day
                        </label>
                        <input
                            type="number"
                            id="maxExecutionsPerDay"
                            data-testid="max-executions-input"
                            value={restrictions.maxExecutionsPerDay}
                            onChange={(e) => handleNumberChange('maxExecutionsPerDay', e.target.value)}
                            min={RESTRICTIONS_LIMITS.maxExecutionsPerDay.min}
                            max={RESTRICTIONS_LIMITS.maxExecutionsPerDay.max}
                            disabled={disabled || isSaving}
                            className={`w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed ${errors.maxExecutionsPerDay
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-zinc-200 dark:border-zinc-700'
                                }`}
                        />
                        {errors.maxExecutionsPerDay ? (
                            <p className="text-xs text-red-500">{errors.maxExecutionsPerDay}</p>
                        ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Agent will auto-pause after reaching this limit (1-1000)
                            </p>
                        )}
                    </div>

                    {/* Max Emails Per Day */}
                    <div className="space-y-2">
                        <label htmlFor="maxEmailsPerDay" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Max Emails Per Day
                        </label>
                        <input
                            type="number"
                            id="maxEmailsPerDay"
                            data-testid="max-emails-input"
                            value={restrictions.maxEmailsPerDay}
                            onChange={(e) => handleNumberChange('maxEmailsPerDay', e.target.value)}
                            min={RESTRICTIONS_LIMITS.maxEmailsPerDay.min}
                            max={RESTRICTIONS_LIMITS.maxEmailsPerDay.max}
                            disabled={disabled || isSaving}
                            className={`w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed ${errors.maxEmailsPerDay
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-zinc-200 dark:border-zinc-700'
                                }`}
                        />
                        {errors.maxEmailsPerDay ? (
                            <p className="text-xs text-red-500">{errors.maxEmailsPerDay}</p>
                        ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Emails will be blocked after this limit (1-500)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Integration Permissions Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <GlobeAltIcon className="w-4 h-4" />
                        Allowed Integrations
                    </h4>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSelectAllIntegrations}
                            disabled={disabled || isSaving}
                            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
                            data-testid="select-all-integrations"
                        >
                            Select All
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-600">|</span>
                        <button
                            type="button"
                            onClick={handleClearAllIntegrations}
                            disabled={disabled || isSaving}
                            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
                            data-testid="clear-all-integrations"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {restrictions.allowedIntegrations.length === 0
                        ? 'All integrations are currently allowed. Select specific ones to restrict access.'
                        : `${restrictions.allowedIntegrations.length} of ${VALID_INTEGRATIONS.length} integrations allowed`
                    }
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {VALID_INTEGRATIONS.map((integration) => {
                        const isSelected = restrictions.allowedIntegrations.length === 0 ||
                            restrictions.allowedIntegrations.includes(integration.id);
                        const isExplicitlySelected = restrictions.allowedIntegrations.includes(integration.id);

                        return (
                            <button
                                key={integration.id}
                                type="button"
                                onClick={() => handleIntegrationToggle(integration.id)}
                                disabled={disabled || isSaving}
                                data-testid={`integration-${integration.id}`}
                                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isExplicitlySelected
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                                    : isSelected && restrictions.allowedIntegrations.length === 0
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                                        : 'bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700'
                                    }`}
                            >
                                {getIntegrationIcon(integration.icon)}
                                <span>{integration.name}</span>
                                {isExplicitlySelected && (
                                    <CheckIcon className="w-4 h-4 ml-auto" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Exclusions Section */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <XMarkIcon className="w-4 h-4" />
                    Excluded Domains
                </h4>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Contacts from these domains will be skipped during execution
                </p>

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Add domain (e.g., competitor.com)"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDomain();
                            }
                        }}
                        disabled={disabled || isSaving}
                        data-testid="add-domain-input"
                        className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="button"
                        onClick={handleAddDomain}
                        disabled={disabled || isSaving || !newDomain.trim()}
                        data-testid="add-domain-button"
                        className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add
                    </button>
                </div>

                {restrictions.excludedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {restrictions.excludedDomains.map((domain) => (
                            <span
                                key={domain}
                                data-testid={`excluded-domain-${domain}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md"
                            >
                                {domain}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveDomain(domain)}
                                    disabled={disabled || isSaving}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-50"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Guardrails Section - Natural Language Rules */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    Guardrails
                </h4>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Write natural language rules and guidelines for the agent to follow
                </p>

                <div className="space-y-2">
                    <textarea
                        id="guardrails"
                        data-testid="guardrails-textarea"
                        value={restrictions.guardrails}
                        onChange={(e) => {
                            setRestrictions(prev => ({
                                ...prev,
                                guardrails: e.target.value
                            }));
                            setHasChanges(true);
                        }}
                        placeholder="Example rules:\n- Never contact anyone at competitor.com\n- Don't send more than 3 follow-up emails\n- Always wait 48 hours between touchpoints\n- Skip contacts who have unsubscribed"
                        disabled={disabled || isSaving}
                        rows={6}
                        maxLength={GUARDRAILS_MAX_LENGTH}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            These rules will be applied during agent execution
                        </p>
                        <span className={`text-xs ${restrictions.guardrails.length > GUARDRAILS_MAX_LENGTH * 0.9 ? 'text-amber-500' : 'text-zinc-400'}`}>
                            {restrictions.guardrails.length}/{GUARDRAILS_MAX_LENGTH}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
