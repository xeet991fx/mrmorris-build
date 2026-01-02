/**
 * Hook to fetch available data sources for workflow step configuration
 *
 * Fetches data sources from the backend API that can be used in {{placeholder}} syntax.
 * Returns entity fields, previous step outputs, workflow variables, loop context, and system variables.
 */

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';

export interface DataSource {
    category: 'entity' | 'variable' | 'step' | 'loop' | 'system';
    path: string;           // Full path: "steps.stepId.field" or "contact.email"
    label: string;          // Human-readable label
    type: string;           // Data type (string, number, boolean, object, array)
    description?: string;   // Help text
    stepId?: string;        // For step sources
    stepName?: string;      // For step sources
    stepType?: string;      // For step sources
}

interface UseDataSourcesOptions {
    search?: string;        // Optional search filter
    grouped?: boolean;      // Return grouped by category
}

interface UseDataSourcesResult {
    dataSources: DataSource[];
    groupedSources: Record<string, DataSource[]> | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Fetch available data sources for a workflow step
 *
 * @param workspaceId - The workspace ID
 * @param workflowId - The workflow ID
 * @param stepId - The current step ID (to determine which previous steps are available)
 * @param options - Optional search filter and grouping
 * @returns Data sources, loading state, and error state
 */
export function useDataSources(
    workspaceId: string | undefined,
    workflowId: string | undefined,
    stepId: string | undefined,
    options: UseDataSourcesOptions = {}
): UseDataSourcesResult {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [groupedSources, setGroupedSources] = useState<Record<string, DataSource[]> | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

    const { search, grouped } = options;

    useEffect(() => {
        // Skip if required params are missing
        if (!workspaceId || !workflowId || !stepId) {
            setDataSources([]);
            setGroupedSources(null);
            setLoading(false);
            setError(null);
            return;
        }

        const fetchDataSources = async () => {
            setLoading(true);
            setError(null);

            try {
                // Build query params
                const params: any = {};
                if (search) {
                    params.search = search;
                }
                if (grouped) {
                    params.grouped = 'true';
                }

                const response = await axios.get(
                    `/workspaces/${workspaceId}/workflows/${workflowId}/steps/${stepId}/data-sources`,
                    { params }
                );

                const data = response.data;

                if (data.grouped && data.dataSources) {
                    // Grouped response
                    setGroupedSources(data.dataSources);
                    // Flatten for dataSources array
                    const flattened: DataSource[] = [];
                    Object.values(data.dataSources as Record<string, DataSource[]>).forEach(categoryItems => {
                        flattened.push(...categoryItems);
                    });
                    setDataSources(flattened);
                } else {
                    // Flat response
                    setDataSources(data.dataSources || []);
                    setGroupedSources(null);
                }

            } catch (err: any) {
                console.error('Error fetching data sources:', err);
                setError(err.message || 'Failed to fetch data sources');
                setDataSources([]);
                setGroupedSources(null);
            } finally {
                setLoading(false);
            }
        };

        fetchDataSources();
    }, [workspaceId, workflowId, stepId, search, grouped, refetchTrigger]);

    const refetch = () => {
        setRefetchTrigger(prev => prev + 1);
    };

    return {
        dataSources,
        groupedSources,
        loading,
        error,
        refetch
    };
}

/**
 * Format data source for display in dropdown
 */
export function formatDataSourceLabel(source: DataSource): string {
    return `${source.label} (${source.type})`;
}

/**
 * Get suggested placeholder text for a data source
 */
export function getSuggestedPlaceholder(source: DataSource): string {
    return `{{${source.path}}}`;
}

/**
 * Extract category color for UI theming
 */
export function getCategoryColor(category: DataSource['category']): string {
    switch (category) {
        case 'entity':
            return 'text-purple-600 bg-purple-50';
        case 'step':
            return 'text-blue-600 bg-blue-50';
        case 'variable':
            return 'text-green-600 bg-green-50';
        case 'loop':
            return 'text-orange-600 bg-orange-50';
        case 'system':
            return 'text-gray-600 bg-gray-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}

/**
 * Get category icon (emoji or character)
 */
export function getCategoryIcon(category: DataSource['category']): string {
    switch (category) {
        case 'entity':
            return '👤';
        case 'step':
            return '🔗';
        case 'variable':
            return '📦';
        case 'loop':
            return '🔄';
        case 'system':
            return '⚙️';
        default:
            return '•';
    }
}
