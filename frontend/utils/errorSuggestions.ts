/**
 * Story 3.14 AC7: Error suggestion utility
 * Maps common error patterns to actionable suggestions
 */

interface ErrorSuggestion {
  message: string;
  actionable: boolean;
}

/**
 * Get an actionable suggestion for a given error message
 */
export function getErrorSuggestion(errorMessage: string): ErrorSuggestion | null {
  if (!errorMessage) {
    return null;
  }

  const lowerError = errorMessage.toLowerCase();

  // Template errors
  if (lowerError.includes('template not found') || lowerError.includes('template') && lowerError.includes('not found')) {
    return {
      message: 'Create the missing template in Settings → Email Templates, or update agent instructions to use an existing template.',
      actionable: true
    };
  }

  // Integration errors
  if (lowerError.includes('integration expired') || lowerError.includes('token expired') || lowerError.includes('authentication failed')) {
    return {
      message: 'Your integration has expired. Reconnect it in Settings → Integrations.',
      actionable: true
    };
  }

  // Rate limit errors
  if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
    return {
      message: 'API rate limit exceeded. Try again in a few minutes, or upgrade your plan for higher limits.',
      actionable: true
    };
  }

  // Contact/entity not found
  if (lowerError.includes('contact not found') || lowerError.includes('contact does not exist')) {
    return {
      message: 'The contact referenced in this execution no longer exists. Verify the contact exists in your workspace.',
      actionable: true
    };
  }

  // Invalid email
  if (lowerError.includes('invalid email') || lowerError.includes('email address') && lowerError.includes('invalid')) {
    return {
      message: 'The email address format is invalid. Check the agent\'s email action parameters.',
      actionable: true
    };
  }

  // Insufficient credits
  if (lowerError.includes('insufficient credits') || lowerError.includes('not enough credits')) {
    return {
      message: 'Not enough AI credits to complete execution. Purchase more credits in Settings → Billing.',
      actionable: true
    };
  }

  // Agent paused
  if (lowerError.includes('agent paused') || lowerError.includes('circuit breaker')) {
    return {
      message: 'Agent was paused due to circuit breaker limits. Check Settings → Agent Governance.',
      actionable: true
    };
  }

  // Network/timeout errors
  if (lowerError.includes('timeout') || lowerError.includes('timed out') || lowerError.includes('network error')) {
    return {
      message: 'Request timed out or network error occurred. Check your internet connection and try again.',
      actionable: true
    };
  }

  // Permission errors
  if (lowerError.includes('permission denied') || lowerError.includes('unauthorized') || lowerError.includes('access denied')) {
    return {
      message: 'Permission denied. Verify your workspace role has sufficient permissions for this action.',
      actionable: true
    };
  }

  // Generic fallback
  return {
    message: 'Review the error details above and update your agent configuration or contact support if the issue persists.',
    actionable: false
  };
}
