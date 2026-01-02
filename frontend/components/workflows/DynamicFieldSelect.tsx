/**
 * DynamicFieldSelect Component
 *
 * Dropdown that fetches live field options from third-party APIs.
 * Used for selecting Slack channels, Google Sheets, Notion databases, etc.
 *
 * Features:
 * - Fetches options from backend API on mount and when dependencies change
 * - Shows loading state while fetching
 * - Handles errors with retry mechanism
 * - Supports dependent fields (e.g., worksheets depend on selected spreadsheet)
 * - Caches results on backend (15 minute TTL)
 */

"use client";

import { useState, useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import axios from '@/lib/axios';

export type IntegrationType = 'slack' | 'google_sheets' | 'notion' | 'gmail' | 'calendar';
export type FieldType = 'channel' | 'user' | 'spreadsheet' | 'worksheet' | 'database' | 'page';

export interface FieldOption {
    value: string;
    label: string;
    metadata?: any;
}

interface DynamicFieldSelectProps {
    integrationType: IntegrationType;
    fieldType: FieldType;
    credentialId: string;
    workspaceId: string;
    workflowId: string;
    value: string;
    onChange: (value: string) => void;
    parentValue?: string; // For dependent fields (e.g., worksheet depends on spreadsheet)
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function DynamicFieldSelect({
    integrationType,
    fieldType,
    credentialId,
    workspaceId,
    workflowId,
    value,
    onChange,
    parentValue,
    placeholder,
    disabled = false,
    className,
}: DynamicFieldSelectProps) {
    const [options, setOptions] = useState<FieldOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch options when component mounts or dependencies change
    useEffect(() => {
        fetchOptions();
    }, [integrationType, fieldType, credentialId, parentValue]);

    async function fetchOptions() {
        setIsLoading(true);
        setError(null);

        try {
            // Build query parameters
            const params: any = {
                integrationType,
                fieldType,
                credentialId,
            };

            // Add parent data if provided (for dependent fields)
            if (parentValue) {
                params.parentData = JSON.stringify({ parentValue });
            }

            // Call backend API
            const response = await axios.get(
                `/workspaces/${workspaceId}/workflows/${workflowId}/fields/fetch`,
                { params }
            );

            setOptions(response.data.options || []);
        } catch (err: any) {
            console.error('[DynamicFieldSelect] Fetch error:', err.message);
            setError(err.message || 'Failed to load options');
        } finally {
            setIsLoading(false);
        }
    }

    // Handle value change
    const handleValueChange = (newValue: string) => {
        onChange(newValue);
    };

    // Error state UI
    if (error) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                            Failed to load options
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                            {error}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchOptions}
                        className="flex-shrink-0"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // Empty state UI
    if (!isLoading && options.length === 0) {
        return (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-muted-foreground text-center">
                    No {fieldType}s found
                </p>
            </div>
        );
    }

    return (
        <Select
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className={className}>
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading {fieldType}s...</span>
                    </div>
                ) : (
                    <SelectValue placeholder={placeholder || `Select ${fieldType}`} />
                )}
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
