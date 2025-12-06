/**
 * Action Parser
 * Parses AI responses to extract structured action commands
 */

export interface ParsedAction {
  type: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  description: string;
  rawText?: string;
}

// Destructive actions that require user confirmation
const DESTRUCTIVE_ACTIONS = [
  'delete_contact',
  'delete_company',
  'bulk_delete_contacts',
  'bulk_delete_companies',
  'delete_all_contacts',
  'delete_all_companies',
];

/**
 * Parse action from AI response using markdown code blocks
 * Expected format:
 * ```action
 * {
 *   "action": "create_contact",
 *   "params": { "firstName": "John", "lastName": "Doe" }
 * }
 * ```
 */
export function parseActionFromResponse(text: string): ParsedAction | null {
  // Look for ```action code blocks
  const actionMatch = text.match(/```action\s*\n([\s\S]*?)\n```/);

  if (!actionMatch) {
    return null;
  }

  try {
    const actionData = JSON.parse(actionMatch[1]);

    if (!actionData.action || !actionData.params) {
      console.error('Invalid action format:', actionData);
      return null;
    }

    return {
      type: actionData.action,
      parameters: actionData.params,
      requiresConfirmation: DESTRUCTIVE_ACTIONS.includes(actionData.action),
      description: getActionDescription(actionData.action, actionData.params),
      rawText: actionMatch[0],
    };
  } catch (error) {
    console.error('Failed to parse action from response:', error);
    return null;
  }
}

/**
 * Generate human-readable description for an action
 */
function getActionDescription(type: string, params: any): string {
  switch (type) {
    // Contact actions
    case 'create_contact':
      return `Create contact: ${params.firstName || ''} ${params.lastName || ''}`.trim();

    case 'update_contact':
      return `Update contact ${params.id || 'selected'}`;

    case 'delete_contact':
      return `Delete contact ${params.id || 'selected'}`;

    case 'bulk_update_contacts':
      const count = params.contactIds?.length || 0;
      return `Update ${count} contact${count !== 1 ? 's' : ''}`;

    case 'bulk_delete_contacts':
      const deleteCount = params.contactIds?.length || 0;
      return `Delete ${deleteCount} contact${deleteCount !== 1 ? 's' : ''}`;

    // Company actions
    case 'create_company':
      return `Create company: ${params.name || ''}`;

    case 'update_company':
      return `Update company ${params.id || 'selected'}`;

    case 'delete_company':
      return `Delete company ${params.id || 'selected'}`;

    case 'link_contact_to_company':
      return `Link contact to company`;

    // Email actions
    case 'send_email':
      const recipientCount = params.to?.length || 1;
      return `Send email to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`;

    case 'send_bulk_email':
      const bulkCount = params.contactIds?.length || 0;
      return `Send email to ${bulkCount} contact${bulkCount !== 1 ? 's' : ''}`;

    // Export actions
    case 'export_contacts':
      return `Export contacts to ${params.format || 'CSV'}`;

    case 'export_companies':
      return `Export companies to ${params.format || 'CSV'}`;

    // Analytics actions
    case 'analyze_contacts':
      return `Analyze contact data`;

    case 'get_contact_stats':
      return `Get contact statistics`;

    case 'find_duplicates':
      return `Find duplicate contacts`;

    // Default
    default:
      return `Execute: ${type.replace(/_/g, ' ')}`;
  }
}

/**
 * Validate action parameters
 * Returns detailed error messages about what's missing
 */
export function validateActionParams(action: ParsedAction): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (action.type) {
    case 'create_contact':
      // Check required fields
      if (!action.parameters.firstName || action.parameters.firstName.trim() === '') {
        errors.push('First name is required');
      }
      if (!action.parameters.lastName || action.parameters.lastName.trim() === '') {
        errors.push('Last name is required');
      }
      // Validate email format if provided
      if (action.parameters.email && !isValidEmail(action.parameters.email)) {
        errors.push('Invalid email format');
      }
      break;

    case 'update_contact':
    case 'delete_contact':
      if (!action.parameters.id) {
        errors.push('Contact ID is required');
      }
      // Validate email format if provided in update
      if (action.type === 'update_contact' && action.parameters.email && !isValidEmail(action.parameters.email)) {
        errors.push('Invalid email format');
      }
      break;

    case 'create_company':
      if (!action.parameters.name || action.parameters.name.trim() === '') {
        errors.push('Company name is required');
      }
      break;

    case 'update_company':
    case 'delete_company':
      if (!action.parameters.id) {
        errors.push('Company ID is required');
      }
      break;

    case 'send_email':
      if (!action.parameters.to || action.parameters.to.length === 0) {
        errors.push('Email recipients are required');
      }
      if (!action.parameters.subject) {
        errors.push('Email subject is required');
      }
      if (!action.parameters.body) {
        errors.push('Email body is required');
      }
      break;

    case 'bulk_update_contacts':
    case 'bulk_delete_contacts':
      if (!action.parameters.contactIds || action.parameters.contactIds.length === 0) {
        errors.push('Contact IDs are required for bulk operations');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Simple email validation helper
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
