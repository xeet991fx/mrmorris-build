/**
 * Structured Error Handling for Agents
 *
 * Provides consistent, actionable error messages with context
 */

export enum ErrorCode {
    // Database errors
    DB_QUERY_FAILED = "DB_QUERY_FAILED",
    DB_NOT_FOUND = "DB_NOT_FOUND",
    DB_DUPLICATE = "DB_DUPLICATE",

    // Validation errors
    VALIDATION_MISSING_FIELD = "VALIDATION_MISSING_FIELD",
    VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT",

    // AI/Model errors
    AI_RESPONSE_INVALID = "AI_RESPONSE_INVALID",
    AI_TIMEOUT = "AI_TIMEOUT",
    AI_QUOTA_EXCEEDED = "AI_QUOTA_EXCEEDED",

    // Tool execution errors
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
    TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",

    // Permission errors
    PERMISSION_DENIED = "PERMISSION_DENIED",

    // Generic
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AgentError {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
    suggestion?: string;
    timestamp: string;
}

/**
 * Create a structured agent error
 */
export function createAgentError(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    suggestion?: string
): AgentError {
    return {
        code,
        message,
        details,
        suggestion,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Format error for user-friendly display
 */
export function formatErrorForUser(error: AgentError): string {
    let msg = error.message;

    if (error.suggestion) {
        msg += `\n\nSuggestion: ${error.suggestion}`;
    }

    return msg;
}

/**
 * Common error creators
 */
export const AgentErrors = {
    notFound: (resource: string, identifier?: string): AgentError =>
        createAgentError(
            ErrorCode.DB_NOT_FOUND,
            `${resource} not found${identifier ? `: ${identifier}` : ''}`,
            { resource, identifier },
            `Double-check the ${resource.toLowerCase()} name or ID and try again.`
        ),

    missingField: (field: string, context?: string): AgentError =>
        createAgentError(
            ErrorCode.VALIDATION_MISSING_FIELD,
            `Required field missing: ${field}${context ? ` (${context})` : ''}`,
            { field, context },
            `Please provide the ${field} field in your request.`
        ),

    duplicate: (resource: string, field: string, value: string): AgentError =>
        createAgentError(
            ErrorCode.DB_DUPLICATE,
            `${resource} with ${field} "${value}" already exists`,
            { resource, field, value },
            `Use a different ${field} or update the existing ${resource}.`
        ),

    aiParsingFailed: (response: string): AgentError =>
        createAgentError(
            ErrorCode.AI_RESPONSE_INVALID,
            "Failed to understand AI response",
            { responsePreview: response.substring(0, 200) },
            "This is a temporary issue. Please try again with a simpler request."
        ),

    toolNotFound: (toolName: string, availableTools: string[]): AgentError =>
        createAgentError(
            ErrorCode.TOOL_NOT_FOUND,
            `Unknown action: ${toolName}`,
            { toolName, availableTools },
            `Available actions: ${availableTools.join(', ')}`
        ),

    executionFailed: (toolName: string, error: Error): AgentError =>
        createAgentError(
            ErrorCode.TOOL_EXECUTION_FAILED,
            `Failed to execute ${toolName}: ${error.message}`,
            { toolName, errorMessage: error.message, errorStack: error.stack },
            "Please try again or contact support if the issue persists."
        ),

    permissionDenied: (action: string, resource: string): AgentError =>
        createAgentError(
            ErrorCode.PERMISSION_DENIED,
            `You don't have permission to ${action} ${resource}`,
            { action, resource },
            "Contact your workspace administrator to request access."
        ),
};
