'use client';

import { useState, useEffect, useCallback } from 'react';
import { updateAgent } from '@/lib/api/agents';
import {
    IAgentMemory,
    IAgentMemoryVariable,
    MEMORY_VARIABLE_TYPES,
    MEMORY_RETENTION_OPTIONS,
    MEMORY_DEFAULTS,
    MAX_MEMORY_VARIABLES
} from '@/types/agent';
import { toast } from 'sonner';
import {
    CpuChipIcon,
    PlusIcon,
    TrashIcon,
    ClockIcon,
    DocumentTextIcon,
    CalculatorIcon,
    CalendarDaysIcon,
    ListBulletIcon,
} from '@heroicons/react/24/outline';

interface MemoryConfigurationProps {
    workspaceId: string;
    agentId: string;
    initialMemory: IAgentMemory | null;
    onSave?: (memory: IAgentMemory) => void;
    disabled?: boolean;
}

export function MemoryConfiguration({
    workspaceId,
    agentId,
    initialMemory,
    onSave,
    disabled = false
}: MemoryConfigurationProps) {
    // Initialize with defaults merged with initial values
    const getInitialState = useCallback((): IAgentMemory => {
        return {
            ...MEMORY_DEFAULTS,
            ...initialMemory
        };
    }, [initialMemory]);

    const [memory, setMemory] = useState<IAgentMemory>(getInitialState);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setMemory(getInitialState());
        setHasChanges(false);
    }, [getInitialState]);

    // Variable name validation
    const isValidVariableName = (name: string): boolean => {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    };

    const validateVariable = (variable: IAgentMemoryVariable, index: number): string | null => {
        if (!variable.name.trim()) {
            return 'Variable name is required';
        }
        if (!isValidVariableName(variable.name)) {
            return 'Must be a valid identifier (letters, numbers, underscore, starting with letter or underscore)';
        }
        if (variable.name.length > 50) {
            return 'Variable name cannot exceed 50 characters';
        }
        // Check for duplicates
        const duplicateIndex = memory.variables.findIndex(
            (v, i) => i !== index && v.name.toLowerCase() === variable.name.toLowerCase()
        );
        if (duplicateIndex !== -1) {
            return 'Variable name must be unique';
        }
        return null;
    };

    const handleToggleMemory = () => {
        setMemory(prev => ({
            ...prev,
            enabled: !prev.enabled
        }));
        setHasChanges(true);
    };

    const handleAddVariable = () => {
        if (memory.variables.length >= MAX_MEMORY_VARIABLES) {
            toast.error(`Maximum ${MAX_MEMORY_VARIABLES} variables allowed`);
            return;
        }

        const newVariable: IAgentMemoryVariable = {
            name: '',
            type: 'string',
            defaultValue: null
        };

        setMemory(prev => ({
            ...prev,
            variables: [...prev.variables, newVariable]
        }));
        setHasChanges(true);
    };

    const handleRemoveVariable = (index: number) => {
        setMemory(prev => ({
            ...prev,
            variables: prev.variables.filter((_, i) => i !== index)
        }));
        // Clear any errors for this variable
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`variable-${index}`];
            return newErrors;
        });
        setHasChanges(true);
    };

    const handleVariableChange = (
        index: number,
        field: keyof IAgentMemoryVariable,
        value: any
    ) => {
        setMemory(prev => ({
            ...prev,
            variables: prev.variables.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            )
        }));

        // Validate on change
        if (field === 'name') {
            const updatedVariable = { ...memory.variables[index], name: value };
            const error = validateVariable(updatedVariable, index);
            setErrors(prev => ({
                ...prev,
                [`variable-${index}`]: error || ''
            }));
        }

        setHasChanges(true);
    };

    const handleRetentionChange = (value: number) => {
        setMemory(prev => ({
            ...prev,
            retentionDays: value
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        // Validate all variables before saving
        const newErrors: Record<string, string> = {};
        let hasError = false;

        memory.variables.forEach((variable, index) => {
            const error = validateVariable(variable, index);
            if (error) {
                newErrors[`variable-${index}`] = error;
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            toast.error('Please fix validation errors before saving');
            return;
        }

        setIsSaving(true);
        try {
            const response = await updateAgent(workspaceId, agentId, { memory });
            if (response.success) {
                toast.success('Memory configuration saved successfully!');
                setHasChanges(false);
                if (onSave && response.agent.memory) {
                    onSave(response.agent.memory);
                }
            }
        } catch (error: any) {
            console.error('Error saving memory configuration:', error);
            // Extract detailed validation errors from response if available
            const details = error.response?.data?.details;
            const errorMessage = error.response?.data?.error || 'Failed to save memory configuration';
            if (details && Array.isArray(details) && details.length > 0) {
                toast.error(`${errorMessage}: ${details.map((d: any) => d.message || d).join(', ')}`);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'string':
                return <DocumentTextIcon className="w-4 h-4" />;
            case 'number':
                return <CalculatorIcon className="w-4 h-4" />;
            case 'date':
                return <CalendarDaysIcon className="w-4 h-4" />;
            case 'array':
                return <ListBulletIcon className="w-4 h-4" />;
            default:
                return <DocumentTextIcon className="w-4 h-4" />;
        }
    };

    const getDefaultValuePlaceholder = (type: string): string => {
        switch (type) {
            case 'string':
                return 'Enter default text...';
            case 'number':
                return '0';
            case 'date':
                return 'YYYY-MM-DD';
            case 'array':
                return '[]';
            default:
                return 'Enter default value...';
        }
    };

    return (
        <div className="space-y-6" data-testid="memory-configuration">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        Memory
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Configure agent memory for tracking state between executions
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || isSaving || !hasChanges || Object.values(errors).some(e => !!e) || memory.variables.some(v => !v.name.trim())}
                    className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    data-testid="save-memory-button"
                >
                    {isSaving ? 'Saving...' : 'Save Memory'}
                </button>
            </div>

            {/* Enable Memory Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <CpuChipIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Enable Memory
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Allow agent to store and retrieve data between executions
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={memory.enabled}
                    onClick={handleToggleMemory}
                    disabled={disabled || isSaving}
                    data-testid="memory-enabled-toggle"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${memory.enabled
                        ? 'bg-zinc-900 dark:bg-white'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${memory.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Memory Variables Section - Only show when enabled */}
            {memory.enabled && (
                <>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Memory Variables
                                </h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Use @memory.variableName to access these values in your instructions
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400">
                                    {memory.variables.length}/{MAX_MEMORY_VARIABLES}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddVariable}
                                    disabled={disabled || isSaving || memory.variables.length >= MAX_MEMORY_VARIABLES}
                                    data-testid="add-variable-button"
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add Variable
                                </button>
                            </div>
                        </div>

                        {/* Variable List */}
                        {memory.variables.length === 0 ? (
                            <div className="text-center py-8 text-sm text-zinc-400 dark:text-zinc-500">
                                No memory variables defined. Click "Add Variable" to create one.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {memory.variables.map((variable, index) => (
                                    <div
                                        key={index}
                                        data-testid={`memory-variable-${index}`}
                                        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Variable Name */}
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                    Variable Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={variable.name}
                                                    onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                                                    placeholder="e.g., emailsSentCount"
                                                    disabled={disabled || isSaving}
                                                    data-testid={`memory-variable-name-${index}`}
                                                    className={`w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed ${errors[`variable-${index}`]
                                                        ? 'border-red-500 focus:ring-red-500'
                                                        : 'border-zinc-200 dark:border-zinc-700'
                                                        }`}
                                                />
                                                {errors[`variable-${index}`] && (
                                                    <p className="text-xs text-red-500">
                                                        {errors[`variable-${index}`]}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Variable Type */}
                                            <div className="w-32 space-y-1">
                                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                    Type
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={variable.type}
                                                        onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                                                        disabled={disabled || isSaving}
                                                        data-testid={`memory-variable-type-${index}`}
                                                        className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                                                    >
                                                        {MEMORY_VARIABLE_TYPES.map(type => (
                                                            <option key={type.id} value={type.id}>
                                                                {type.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        {getTypeIcon(variable.type)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveVariable(index)}
                                                disabled={disabled || isSaving}
                                                data-testid={`remove-variable-${index}`}
                                                className="mt-6 p-2 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Default Value */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                Default Value (optional)
                                            </label>
                                            <input
                                                type={variable.type === 'number' ? 'number' : 'text'}
                                                value={variable.defaultValue != null ? String(variable.defaultValue) : ''}
                                                onChange={(e) => {
                                                    let value: any = e.target.value;
                                                    if (variable.type === 'number') {
                                                        // Handle empty or invalid number inputs gracefully
                                                        const parsed = parseFloat(value);
                                                        value = value === '' || isNaN(parsed) ? null : parsed;
                                                    } else {
                                                        value = value === '' ? null : value;
                                                    }
                                                    handleVariableChange(index, 'defaultValue', value);
                                                }}
                                                placeholder={getDefaultValuePlaceholder(variable.type)}
                                                disabled={disabled || isSaving}
                                                data-testid={`memory-variable-default-${index}`}
                                                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Retention Period Section */}
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4" />
                                Memory Retention
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Memory data older than this period will be automatically deleted
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {MEMORY_RETENTION_OPTIONS.map((option) => {
                                const isSelected = memory.retentionDays === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleRetentionChange(option.value)}
                                        disabled={disabled || isSaving}
                                        data-testid={`retention-${option.value}`}
                                        className={`px-4 py-3 text-sm font-medium rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Disabled State Message */}
            {!memory.enabled && (
                <div className="text-center py-8 text-sm text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    Enable memory to configure variables and retention settings
                </div>
            )}
        </div>
    );
}
