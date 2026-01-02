/**
 * Data Source Resolver
 *
 * Provides introspection of available data sources at any point in a workflow.
 * Used by frontend to populate autocomplete dropdowns with {{steps.stepId.field}} suggestions.
 */

import { IWorkflowStep } from '../../models/Workflow';
import { getOutputSchema, getOutputPaths } from './outputSchemas';

// ============================================
// TYPES
// ============================================

export interface DataSource {
    category: 'entity' | 'variable' | 'step' | 'loop' | 'system';
    path: string;           // Full path: "steps.stepId.field" or "contact.email"
    label: string;          // Human-readable label
    type: string;           // Data type
    description?: string;   // Help text
    stepId?: string;        // For step sources
    stepName?: string;      // For step sources
    stepType?: string;      // For step sources
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Get all available data sources for a specific step in a workflow
 */
export function getAvailableDataSources(
    workflow: any,
    currentStepId: string,
    entityType: 'contact' | 'deal' | 'company'
): DataSource[] {
    const sources: DataSource[] = [];

    // 1. ENTITY FIELDS (contact, deal, or company)
    sources.push(...getEntityFields(entityType));

    // 2. PREVIOUS STEP OUTPUTS
    sources.push(...getUpstreamStepOutputs(workflow, currentStepId));

    // 3. WORKFLOW VARIABLES
    // Note: Variables are dynamic, so we provide a general entry
    sources.push({
        category: 'variable',
        path: 'variables',
        label: 'Workflow Variables',
        type: 'object',
        description: 'Variables set by Transform nodes (use variables.varName)'
    });

    // 4. LOOP CONTEXT (if inside a loop)
    if (isInsideLoop(workflow, currentStepId)) {
        sources.push(
            {
                category: 'loop',
                path: 'item',
                label: 'Current Loop Item',
                type: 'any',
                description: 'Current item in loop iteration'
            },
            {
                category: 'loop',
                path: 'index',
                label: 'Current Loop Index',
                type: 'number',
                description: 'Current iteration index (0-based)'
            }
        );
    }

    // 5. SYSTEM VARIABLES
    sources.push(
        {
            category: 'system',
            path: '$now',
            label: 'Current Timestamp',
            type: 'string',
            description: 'Current ISO timestamp'
        },
        {
            category: 'system',
            path: '$today',
            label: 'Today\'s Date',
            type: 'string',
            description: 'Today\'s date (YYYY-MM-DD)'
        }
    );

    return sources;
}

// ============================================
// ENTITY FIELDS
// ============================================

/**
 * Get entity field data sources
 */
function getEntityFields(entityType: string): DataSource[] {
    const commonFields = [
        { field: 'firstName', label: 'First Name', type: 'string' },
        { field: 'lastName', label: 'Last Name', type: 'string' },
        { field: 'email', label: 'Email', type: 'string' },
        { field: 'phone', label: 'Phone', type: 'string' },
        { field: 'company', label: 'Company', type: 'string' },
        { field: 'title', label: 'Job Title', type: 'string' },
        { field: 'status', label: 'Status', type: 'string' },
        { field: 'source', label: 'Source', type: 'string' },
        { field: 'tags', label: 'Tags', type: 'array' },
        { field: 'customFields', label: 'Custom Fields', type: 'object' },
        { field: 'createdAt', label: 'Created Date', type: 'string' },
        { field: 'updatedAt', label: 'Updated Date', type: 'string' },
    ];

    const dealFields = [
        { field: 'dealValue', label: 'Deal Value', type: 'number' },
        { field: 'stage', label: 'Deal Stage', type: 'string' },
        { field: 'closeDate', label: 'Close Date', type: 'string' },
        { field: 'probability', label: 'Probability', type: 'number' },
        { field: 'dealType', label: 'Deal Type', type: 'string' },
    ];

    const companyFields = [
        { field: 'industry', label: 'Industry', type: 'string' },
        { field: 'size', label: 'Company Size', type: 'number' },
        { field: 'revenue', label: 'Annual Revenue', type: 'number' },
        { field: 'website', label: 'Website', type: 'string' },
        { field: 'location', label: 'Location', type: 'string' },
    ];

    let fields = commonFields;
    if (entityType === 'deal') {
        fields = [...commonFields, ...dealFields];
    } else if (entityType === 'company') {
        fields = [...commonFields, ...companyFields];
    }

    return fields.map(f => ({
        category: 'entity' as const,
        path: `contact.${f.field}`,
        label: `${capitalizeEntityType(entityType)}: ${f.label}`,
        type: f.type,
        description: `${capitalizeEntityType(entityType)} ${f.field} field`
    }));
}

/**
 * Capitalize entity type for display
 */
function capitalizeEntityType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

// ============================================
// UPSTREAM STEP OUTPUTS
// ============================================

/**
 * Get upstream step outputs that are available to current step
 */
function getUpstreamStepOutputs(workflow: any, currentStepId: string): DataSource[] {
    const sources: DataSource[] = [];
    const steps = workflow.steps || [];

    // Find all steps that execute before current step
    const upstreamSteps = getUpstreamSteps(steps, currentStepId);

    for (const step of upstreamSteps) {
        const stepType = step.type;
        const actionType = (step.config as any)?.actionType;

        // Get output schema for this step type
        const schema = getOutputSchema(stepType, actionType);
        const outputPaths = Object.keys(schema);

        for (const outputPath of outputPaths) {
            const fieldSchema = schema[outputPath];
            sources.push({
                category: 'step',
                path: `steps.${step.id}.${outputPath}`,
                label: `${step.name}: ${outputPath}`,
                type: fieldSchema.type,
                description: fieldSchema.description,
                stepId: step.id,
                stepName: step.name,
                stepType: stepType
            });
        }
    }

    return sources;
}

/**
 * Get all steps that execute before the current step
 *
 * Uses graph traversal to find all upstream steps by following incoming edges.
 */
function getUpstreamSteps(steps: IWorkflowStep[], currentStepId: string): IWorkflowStep[] {
    const upstream: IWorkflowStep[] = [];
    const visited = new Set<string>();

    function traverse(stepId: string) {
        if (visited.has(stepId) || stepId === currentStepId) {
            return;
        }

        visited.add(stepId);

        // Find steps that point to this step
        const parentSteps = steps.filter(s => {
            // Check nextStepIds
            if (s.nextStepIds?.includes(stepId)) {
                return true;
            }

            // Check branches (yes/no for conditions, success/error for try_catch, etc.)
            if (s.branches) {
                const branchTargets = [
                    s.branches.yes,
                    s.branches.no,
                    s.branches.success,
                    s.branches.error,
                    s.branches.timeout,
                    ...(s.branches.parallel || [])
                ].filter(Boolean);

                if (branchTargets.includes(stepId)) {
                    return true;
                }
            }

            return false;
        });

        for (const parentStep of parentSteps) {
            upstream.push(parentStep);
            traverse(parentStep.id);
        }
    }

    traverse(currentStepId);

    // Remove duplicates and sort by name
    const uniqueUpstream = Array.from(new Map(upstream.map(s => [s.id, s])).values());
    return uniqueUpstream.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check if a step is inside a loop
 */
function isInsideLoop(workflow: any, currentStepId: string): boolean {
    const steps = workflow.steps || [];

    // Simple check: see if there's a loop step upstream
    const upstream = getUpstreamSteps(steps, currentStepId);
    return upstream.some(s => s.type === 'loop');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
 * Group data sources by category
 */
export function groupDataSourcesByCategory(sources: DataSource[]): Record<string, DataSource[]> {
    const grouped: Record<string, DataSource[]> = {
        entity: [],
        step: [],
        variable: [],
        loop: [],
        system: []
    };

    for (const source of sources) {
        if (grouped[source.category]) {
            grouped[source.category].push(source);
        }
    }

    return grouped;
}

/**
 * Search/filter data sources by query
 */
export function searchDataSources(sources: DataSource[], query: string): DataSource[] {
    if (!query || query.trim() === '') {
        return sources;
    }

    const searchTerm = query.toLowerCase();

    return sources.filter(source => {
        return (
            source.label.toLowerCase().includes(searchTerm) ||
            source.path.toLowerCase().includes(searchTerm) ||
            source.description?.toLowerCase().includes(searchTerm) ||
            source.stepName?.toLowerCase().includes(searchTerm)
        );
    });
}
