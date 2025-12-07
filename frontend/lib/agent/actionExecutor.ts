/**
 * Action Executor
 * Executes parsed actions by calling the appropriate API endpoints
 */

import * as contactApi from '@/lib/api/contact';
import * as companyApi from '@/lib/api/company';
import * as pipelineApi from '@/lib/api/pipeline';
import * as opportunityApi from '@/lib/api/opportunity';
import { ParsedAction, validateActionParams } from './actionParser';
import toast from 'react-hot-toast';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Execute a parsed action
 */
export async function executeAction(
  action: ParsedAction,
  workspaceId: string
): Promise<ActionResult> {
  // Validate action parameters
  const validation = validateActionParams(action);
  if (!validation.valid) {
    return {
      success: false,
      message: 'Missing required information',
      error: `Please provide the following: ${validation.errors.join('; ')}`,
    };
  }

  try {
    switch (action.type) {
      // ===== Contact Actions =====
      case 'create_contact':
        return await executeCreateContact(workspaceId, action.parameters);

      case 'update_contact':
        return await executeUpdateContact(workspaceId, action.parameters);

      case 'delete_contact':
        return await executeDeleteContact(workspaceId, action.parameters);

      case 'bulk_update_contacts':
        return await executeBulkUpdateContacts(workspaceId, action.parameters);

      case 'bulk_delete_contacts':
        return await executeBulkDeleteContacts(workspaceId, action.parameters);

      // ===== Company Actions =====
      case 'create_company':
        return await executeCreateCompany(workspaceId, action.parameters);

      case 'update_company':
        return await executeUpdateCompany(workspaceId, action.parameters);

      case 'delete_company':
        return await executeDeleteCompany(workspaceId, action.parameters);

      case 'link_contact_to_company':
        return await executeLinkContactToCompany(workspaceId, action.parameters);

      // ===== Email Actions =====
      case 'send_email':
        return await executeSendEmail(workspaceId, action.parameters);

      case 'send_bulk_email':
        return await executeSendBulkEmail(workspaceId, action.parameters);

      // ===== Export Actions =====
      case 'export_contacts':
        return await executeExportContacts(workspaceId, action.parameters);

      case 'export_companies':
        return await executeExportCompanies(workspaceId, action.parameters);

      // ===== Analytics Actions =====
      case 'analyze_contacts':
        return await executeAnalyzeContacts(workspaceId, action.parameters);

      case 'get_contact_stats':
        return await executeGetContactStats(workspaceId, action.parameters);

      // ===== Pipeline Actions =====
      case 'create_pipeline':
        return await executeCreatePipeline(workspaceId, action.parameters);

      case 'update_pipeline':
        return await executeUpdatePipeline(workspaceId, action.parameters);

      case 'delete_pipeline':
        return await executeDeletePipeline(workspaceId, action.parameters);

      case 'add_stage':
        return await executeAddStage(workspaceId, action.parameters);

      case 'update_stage':
        return await executeUpdateStage(workspaceId, action.parameters);

      case 'delete_stage':
        return await executeDeleteStage(workspaceId, action.parameters);

      case 'reorder_stages':
        return await executeReorderStages(workspaceId, action.parameters);

      case 'set_default_pipeline':
        return await executeSetDefaultPipeline(workspaceId, action.parameters);

      // ===== Opportunity Actions =====
      case 'create_opportunity':
        return await executeCreateOpportunity(workspaceId, action.parameters);

      case 'update_opportunity':
        return await executeUpdateOpportunity(workspaceId, action.parameters);

      case 'move_opportunity':
        return await executeMoveOpportunity(workspaceId, action.parameters);

      case 'delete_opportunity':
        return await executeDeleteOpportunity(workspaceId, action.parameters);

      case 'bulk_update_opportunities':
        return await executeBulkUpdateOpportunities(workspaceId, action.parameters);

      case 'bulk_delete_opportunities':
        return await executeBulkDeleteOpportunities(workspaceId, action.parameters);

      default:
        return {
          success: false,
          message: `Unknown action type: ${action.type}`,
          error: 'Action not implemented',
        };
    }
  } catch (error: any) {
    console.error('Action execution error:', error);
    return {
      success: false,
      message: 'Failed to execute action',
      error: error.message || 'Unknown error occurred',
    };
  }
}

// ===== Contact Action Implementations =====

async function executeCreateContact(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await contactApi.createContact(workspaceId, params);

    if (response.success && response.data) {
      return {
        success: true,
        message: `✅ Contact created successfully: ${params.firstName || ''} ${params.lastName || ''}`.trim(),
        data: response.data.contact,
      };
    }

    // Extract more detailed error message
    let errorDetail = response.error || 'Unknown error';

    // Check if it's a validation error from the backend
    if (response.error && typeof response.error === 'string') {
      if (response.error.includes('firstName')) {
        errorDetail = 'First name is required';
      } else if (response.error.includes('lastName')) {
        errorDetail = 'Last name is required';
      } else if (response.error.includes('email')) {
        errorDetail = 'Invalid email format';
      }
    }

    return {
      success: false,
      message: 'Failed to create contact',
      error: errorDetail,
    };
  } catch (error: any) {
    // Parse error response for more details
    let errorMessage = error.message || 'Unknown error occurred';

    if (error.response?.data?.details) {
      // Zod validation errors from backend
      const details = error.response.data.details;
      if (Array.isArray(details)) {
        const messages = details.map((d: any) => `${d.path?.join('.')}: ${d.message}`);
        errorMessage = messages.join('; ');
      }
    }

    return {
      success: false,
      message: 'Failed to create contact',
      error: errorMessage,
    };
  }
}

async function executeUpdateContact(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { id, ...updateData } = params;
    const response = await contactApi.updateContact(workspaceId, id, updateData);

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Contact updated successfully',
        data: response.data.contact,
      };
    }

    return {
      success: false,
      message: 'Failed to update contact',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update contact',
      error: error.message,
    };
  }
}

async function executeDeleteContact(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await contactApi.deleteContact(workspaceId, params.id);

    if (response.success) {
      return {
        success: true,
        message: 'Contact deleted successfully',
      };
    }

    return {
      success: false,
      message: 'Failed to delete contact',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete contact',
      error: error.message,
    };
  }
}

async function executeBulkUpdateContacts(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { contactIds, updates } = params;
    const results = await Promise.allSettled(
      contactIds.map((id: string) => contactApi.updateContact(workspaceId, id, updates))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;

    return {
      success: failCount === 0,
      message: `Updated ${successCount} contact${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''
        }`,
      data: { successCount, failCount },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to bulk update contacts',
      error: error.message,
    };
  }
}

async function executeBulkDeleteContacts(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { contactIds } = params;
    const results = await Promise.allSettled(
      contactIds.map((id: string) => contactApi.deleteContact(workspaceId, id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;

    return {
      success: failCount === 0,
      message: `Deleted ${successCount} contact${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''
        }`,
      data: { successCount, failCount },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to bulk delete contacts',
      error: error.message,
    };
  }
}

// ===== Company Action Implementations =====

async function executeCreateCompany(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await companyApi.createCompany(workspaceId, params);

    if (response.success && response.data) {
      return {
        success: true,
        message: `Company created: ${params.name}`,
        data: response.data.company,
      };
    }

    return {
      success: false,
      message: 'Failed to create company',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create company',
      error: error.message,
    };
  }
}

async function executeUpdateCompany(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { id, ...updateData } = params;
    const response = await companyApi.updateCompany(workspaceId, id, updateData);

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Company updated successfully',
        data: response.data.company,
      };
    }

    return {
      success: false,
      message: 'Failed to update company',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update company',
      error: error.message,
    };
  }
}

async function executeDeleteCompany(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await companyApi.deleteCompany(workspaceId, params.id);

    if (response.success) {
      return {
        success: true,
        message: 'Company deleted successfully',
      };
    }

    return {
      success: false,
      message: 'Failed to delete company',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete company',
      error: error.message,
    };
  }
}

async function executeLinkContactToCompany(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { contactId, companyId } = params;

    // Update contact with company reference
    const response = await contactApi.updateContact(workspaceId, contactId, {
      company: companyId,
    });

    if (response.success) {
      return {
        success: true,
        message: 'Contact linked to company successfully',
        data: response.data,
      };
    }

    return {
      success: false,
      message: 'Failed to link contact to company',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to link contact to company',
      error: error.message,
    };
  }
}

// ===== Email Action Implementations =====

async function executeSendEmail(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  // TODO: Implement email sending when email service is ready
  return {
    success: false,
    message: 'Email sending not yet implemented',
    error: 'Feature coming soon',
  };
}

async function executeSendBulkEmail(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  // TODO: Implement bulk email sending when email service is ready
  return {
    success: false,
    message: 'Bulk email sending not yet implemented',
    error: 'Feature coming soon',
  };
}

// ===== Export Action Implementations =====

async function executeExportContacts(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    // Fetch all contacts
    const response = await contactApi.getContacts(workspaceId);

    if (!response.success || !response.data) {
      return {
        success: false,
        message: 'Failed to fetch contacts for export',
        error: response.error,
      };
    }

    const contacts = response.data.contacts;
    const format = params.format || 'CSV';

    // Convert to CSV
    if (format === 'CSV') {
      const csv = convertContactsToCSV(contacts);
      downloadCSV(csv, 'contacts-export.csv');

      return {
        success: true,
        message: `Exported ${contacts.length} contacts to CSV`,
        data: { count: contacts.length },
      };
    }

    return {
      success: false,
      message: `Unsupported export format: ${format}`,
      error: 'Only CSV format is currently supported',
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to export contacts',
      error: error.message,
    };
  }
}

async function executeExportCompanies(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    // Fetch all companies
    const response = await companyApi.getCompanies(workspaceId);

    if (!response.success || !response.data) {
      return {
        success: false,
        message: 'Failed to fetch companies for export',
        error: response.error,
      };
    }

    const companies = response.data.companies;
    const format = params.format || 'CSV';

    // Convert to CSV
    if (format === 'CSV') {
      const csv = convertCompaniesToCSV(companies);
      downloadCSV(csv, 'companies-export.csv');

      return {
        success: true,
        message: `Exported ${companies.length} companies to CSV`,
        data: { count: companies.length },
      };
    }

    return {
      success: false,
      message: `Unsupported export format: ${format}`,
      error: 'Only CSV format is currently supported',
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to export companies',
      error: error.message,
    };
  }
}

// ===== Analytics Action Implementations =====

async function executeAnalyzeContacts(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await contactApi.getContacts(workspaceId);

    if (!response.success || !response.data) {
      return {
        success: false,
        message: 'Failed to fetch contacts for analysis',
        error: response.error,
      };
    }

    const contacts = response.data.contacts;
    const analysis = analyzeContactData(contacts);

    return {
      success: true,
      message: 'Contact analysis complete',
      data: analysis,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to analyze contacts',
      error: error.message,
    };
  }
}

async function executeGetContactStats(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await contactApi.getContacts(workspaceId);

    if (!response.success || !response.data) {
      return {
        success: false,
        message: 'Failed to fetch contact statistics',
        error: response.error,
      };
    }

    const stats = calculateContactStats(response.data.contacts);

    return {
      success: true,
      message: 'Contact statistics retrieved',
      data: stats,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to get contact statistics',
      error: error.message,
    };
  }
}

// ===== Helper Functions =====

function convertContactsToCSV(contacts: any[]): string {
  if (contacts.length === 0) return '';

  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Job Title',
    'Status',
    'Source',
  ];

  const rows = contacts.map((contact) => [
    contact.firstName || '',
    contact.lastName || '',
    contact.email || '',
    contact.phone || '',
    contact.company?.name || '',
    contact.jobTitle || '',
    contact.status || '',
    contact.source || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

function convertCompaniesToCSV(companies: any[]): string {
  if (companies.length === 0) return '';

  const headers = ['Name', 'Industry', 'Website', 'Phone', 'Employee Count', 'Status'];

  const rows = companies.map((company) => [
    company.name || '',
    company.industry || '',
    company.website || '',
    company.phone || '',
    company.employeeCount || '',
    company.status || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function analyzeContactData(contacts: any[]): any {
  return {
    totalContacts: contacts.length,
    byStatus: groupBy(contacts, 'status'),
    bySource: groupBy(contacts, 'source'),
    withEmail: contacts.filter((c) => c.email).length,
    withPhone: contacts.filter((c) => c.phone).length,
    withCompany: contacts.filter((c) => c.company).length,
  };
}

function calculateContactStats(contacts: any[]): any {
  return {
    total: contacts.length,
    active: contacts.filter((c) => c.status === 'active').length,
    leads: contacts.filter((c) => c.status === 'lead').length,
    customers: contacts.filter((c) => c.status === 'customer').length,
    archived: contacts.filter((c) => c.status === 'archived').length,
  };
}

function groupBy(array: any[], key: string): Record<string, number> {
  return array.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ===== Pipeline Action Implementations =====

// Color name to hex mapping for common colors
const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280',
  grey: '#6B7280',
  black: '#1F2937',
  white: '#F9FAFB',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  indigo: '#6366F1',
  lime: '#84CC16',
  amber: '#F59E0B',
};

// Default colors for stages when none provided
const DEFAULT_STAGE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EF4444', // red
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

function normalizeStageColor(color: string | undefined, index: number): string {
  if (!color) {
    return DEFAULT_STAGE_COLORS[index % DEFAULT_STAGE_COLORS.length];
  }

  // Already a valid hex color
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  // Try to convert color name to hex
  const lowerColor = color.toLowerCase().trim();
  if (COLOR_NAME_TO_HEX[lowerColor]) {
    return COLOR_NAME_TO_HEX[lowerColor];
  }

  // If it's a 3-digit hex, expand it
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }

  // Fallback to default color
  return DEFAULT_STAGE_COLORS[index % DEFAULT_STAGE_COLORS.length];
}

async function executeCreatePipeline(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    // Normalize stages - ensure colors are valid hex format
    const normalizedParams = { ...params };
    if (normalizedParams.stages && Array.isArray(normalizedParams.stages)) {
      normalizedParams.stages = normalizedParams.stages.map((stage: any, index: number) => ({
        ...stage,
        color: normalizeStageColor(stage.color, index),
      }));
    }

    console.log('Creating pipeline with params:', JSON.stringify(normalizedParams, null, 2));

    const response = await pipelineApi.createPipeline(workspaceId, normalizedParams);

    if (response.success && response.data) {
      return {
        success: true,
        message: `✅ Pipeline "${params.name}" created successfully with ${params.stages?.length || 0} stages`,
        data: response.data.pipeline,
      };
    }

    return {
      success: false,
      message: 'Failed to create pipeline',
      error: response.error,
    };
  } catch (error: any) {
    console.error('Pipeline creation error:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to create pipeline',
      error: error.response?.data?.error || error.message,
    };
  }
}

async function executeUpdatePipeline(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { id, ...updateData } = params;
    const response = await pipelineApi.updatePipeline(workspaceId, id, updateData);

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Pipeline updated successfully',
        data: response.data.pipeline,
      };
    }

    return {
      success: false,
      message: 'Failed to update pipeline',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update pipeline',
      error: error.message,
    };
  }
}

async function executeDeletePipeline(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await pipelineApi.deletePipeline(workspaceId, params.id);

    if (response.success) {
      return {
        success: true,
        message: 'Pipeline deleted successfully',
      };
    }

    return {
      success: false,
      message: 'Failed to delete pipeline',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete pipeline',
      error: error.message,
    };
  }
}

// Helper to resolve pipeline name/ID to actual ObjectId
async function resolvePipelineId(
  workspaceId: string,
  pipelineIdOrName: string
): Promise<{ pipelineId: string } | { error: string }> {
  try {
    // If it's already a valid ObjectId, return it directly
    if (isValidObjectId(pipelineIdOrName)) {
      return { pipelineId: pipelineIdOrName };
    }

    // Fetch all pipelines to find the matching one
    const pipelinesResponse = await pipelineApi.getPipelines(workspaceId);
    if (!pipelinesResponse.success || !pipelinesResponse.data?.pipelines) {
      return { error: 'Failed to fetch pipelines' };
    }

    const pipelines = pipelinesResponse.data.pipelines;

    // Find pipeline by name (exact match first)
    let pipeline = pipelines.find((p) => p.name.toLowerCase() === pipelineIdOrName.toLowerCase());

    if (!pipeline) {
      // Try partial match
      pipeline = pipelines.find((p) =>
        p.name.toLowerCase().includes(pipelineIdOrName.toLowerCase()) ||
        pipelineIdOrName.toLowerCase().includes(p.name.toLowerCase())
      );
    }

    if (!pipeline) {
      return { error: `Pipeline "${pipelineIdOrName}" not found. Available pipelines: ${pipelines.map(p => p.name).join(', ')}` };
    }

    return { pipelineId: pipeline._id };
  } catch (error: any) {
    return { error: error.message || 'Failed to resolve pipeline' };
  }
}

async function executeAddStage(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { pipelineId, stageName, stageColor, order } = params;

    // Resolve pipeline name to ID if needed
    const resolved = await resolvePipelineId(workspaceId, pipelineId);

    if ('error' in resolved) {
      return {
        success: false,
        message: 'Failed to add stage',
        error: resolved.error,
      };
    }

    // Normalize the stage color
    const normalizedColor = normalizeStageColor(stageColor, 0);

    const response = await pipelineApi.addStage(workspaceId, resolved.pipelineId, {
      name: stageName,
      color: normalizedColor,
      order,
    });

    if (response.success && response.data) {
      return {
        success: true,
        message: `✅ Stage "${stageName}" added to pipeline`,
        data: response.data.pipeline,
      };
    }

    return {
      success: false,
      message: 'Failed to add stage',
      error: response.error,
    };
  } catch (error: any) {
    console.error('Add stage error:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to add stage',
      error: error.response?.data?.error || error.message,
    };
  }
}

async function executeUpdateStage(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { pipelineId, stageId, ...updateData } = params;
    const response = await pipelineApi.updateStage(workspaceId, pipelineId, stageId, updateData);

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Stage updated successfully',
        data: response.data.pipeline,
      };
    }

    return {
      success: false,
      message: 'Failed to update stage',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update stage',
      error: error.message,
    };
  }
}

async function executeDeleteStage(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { pipelineId, stageId } = params;
    const response = await pipelineApi.deleteStage(workspaceId, pipelineId, stageId);

    if (response.success) {
      return {
        success: true,
        message: 'Stage deleted successfully',
      };
    }

    return {
      success: false,
      message: 'Failed to delete stage',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete stage',
      error: error.message,
    };
  }
}

async function executeReorderStages(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { pipelineId, stageOrder } = params;
    const response = await pipelineApi.reorderStages(workspaceId, pipelineId, stageOrder);

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Stages reordered successfully',
        data: response.data.pipeline,
      };
    }

    return {
      success: false,
      message: 'Failed to reorder stages',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to reorder stages',
      error: error.message,
    };
  }
}

async function executeSetDefaultPipeline(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { pipelineId } = params;
    const response = await pipelineApi.updatePipeline(workspaceId, pipelineId, { isDefault: true });

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Default pipeline set successfully',
        data: response.data.pipeline,
      };
    }

    return {
      success: false,
      message: 'Failed to set default pipeline',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to set default pipeline',
      error: error.message,
    };
  }
}

// ===== Opportunity Action Implementations =====

// Helper to check if a string is a valid MongoDB ObjectId
function isValidObjectId(str: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(str);
}

// Helper to resolve pipeline and stage names to IDs
async function resolvePipelineAndStage(
  workspaceId: string,
  pipelineIdOrName: string,
  stageIdOrName: string
): Promise<{ pipelineId: string; stageId: string } | { error: string }> {
  try {
    // If both are valid ObjectIds, return them directly
    if (isValidObjectId(pipelineIdOrName) && isValidObjectId(stageIdOrName)) {
      return { pipelineId: pipelineIdOrName, stageId: stageIdOrName };
    }

    // Fetch all pipelines to find the matching one
    const pipelinesResponse = await pipelineApi.getPipelines(workspaceId);
    if (!pipelinesResponse.success || !pipelinesResponse.data?.pipelines) {
      return { error: 'Failed to fetch pipelines' };
    }

    const pipelines = pipelinesResponse.data.pipelines;

    // Find pipeline by ID or name
    let pipeline = isValidObjectId(pipelineIdOrName)
      ? pipelines.find((p) => p._id === pipelineIdOrName)
      : pipelines.find((p) => p.name.toLowerCase() === pipelineIdOrName.toLowerCase());

    if (!pipeline) {
      // Try partial match
      pipeline = pipelines.find((p) =>
        p.name.toLowerCase().includes(pipelineIdOrName.toLowerCase())
      );
    }

    if (!pipeline) {
      return { error: `Pipeline "${pipelineIdOrName}" not found. Available pipelines: ${pipelines.map(p => p.name).join(', ')}` };
    }

    // Find stage by ID or name
    let stage = isValidObjectId(stageIdOrName)
      ? pipeline.stages.find((s) => s._id === stageIdOrName)
      : pipeline.stages.find((s) => s.name.toLowerCase() === stageIdOrName.toLowerCase());

    if (!stage) {
      // Try partial match
      stage = pipeline.stages.find((s) =>
        s.name.toLowerCase().includes(stageIdOrName.toLowerCase())
      );
    }

    if (!stage) {
      // Default to first stage if not found
      if (pipeline.stages.length > 0) {
        stage = pipeline.stages[0];
        console.log(`Stage "${stageIdOrName}" not found, defaulting to "${stage.name}"`);
      } else {
        return { error: `Stage "${stageIdOrName}" not found in pipeline "${pipeline.name}". Available stages: ${pipeline.stages.map(s => s.name).join(', ')}` };
      }
    }

    return { pipelineId: pipeline._id, stageId: stage._id };
  } catch (error: any) {
    return { error: error.message || 'Failed to resolve pipeline and stage' };
  }
}

async function executeCreateOpportunity(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    // Resolve pipeline and stage names to IDs if needed
    const { pipelineId, stageId, ...otherParams } = params;

    if (!pipelineId || !stageId) {
      return {
        success: false,
        message: 'Failed to create opportunity',
        error: 'Pipeline and stage are required. Please specify which pipeline and stage to add this opportunity to.',
      };
    }

    const resolved = await resolvePipelineAndStage(workspaceId, pipelineId, stageId);

    if ('error' in resolved) {
      return {
        success: false,
        message: 'Failed to create opportunity',
        error: resolved.error,
      };
    }

    const normalizedParams = {
      ...otherParams,
      pipelineId: resolved.pipelineId,
      stageId: resolved.stageId,
    };

    console.log('Creating opportunity with resolved params:', JSON.stringify(normalizedParams, null, 2));

    const response = await opportunityApi.createOpportunity(workspaceId, normalizedParams);

    if (response.success && response.data) {
      const value = params.value ? `worth $${Number(params.value).toLocaleString()}` : '';
      return {
        success: true,
        message: `✅ Opportunity "${params.title}" created ${value}`,
        data: response.data.opportunity,
      };
    }

    return {
      success: false,
      message: 'Failed to create opportunity',
      error: response.error,
    };
  } catch (error: any) {
    console.error('Opportunity creation error:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Failed to create opportunity',
      error: error.response?.data?.error || error.message,
    };
  }
}

async function executeUpdateOpportunity(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { id, ...updateData } = params;
    const response = await opportunityApi.updateOpportunity(workspaceId, id, updateData);

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Opportunity updated successfully',
        data: response.data.opportunity,
      };
    }

    return {
      success: false,
      message: 'Failed to update opportunity',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update opportunity',
      error: error.message,
    };
  }
}

async function executeMoveOpportunity(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { id, stageId } = params;
    const response = await opportunityApi.moveOpportunity(workspaceId, id, { stageId });

    if (response.success && response.data) {
      return {
        success: true,
        message: 'Opportunity moved to new stage',
        data: response.data.opportunity,
      };
    }

    return {
      success: false,
      message: 'Failed to move opportunity',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to move opportunity',
      error: error.message,
    };
  }
}

async function executeDeleteOpportunity(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const response = await opportunityApi.deleteOpportunity(workspaceId, params.id);

    if (response.success) {
      return {
        success: true,
        message: 'Opportunity deleted successfully',
      };
    }

    return {
      success: false,
      message: 'Failed to delete opportunity',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to delete opportunity',
      error: error.message,
    };
  }
}

async function executeBulkUpdateOpportunities(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { opportunityIds, updates } = params;
    const results = await Promise.allSettled(
      opportunityIds.map((id: string) => opportunityApi.updateOpportunity(workspaceId, id, updates))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;

    return {
      success: failCount === 0,
      message: `Updated ${successCount} opportunit${successCount !== 1 ? 'ies' : 'y'}${failCount > 0 ? `, ${failCount} failed` : ''
        }`,
      data: { successCount, failCount },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to bulk update opportunities',
      error: error.message,
    };
  }
}

async function executeBulkDeleteOpportunities(
  workspaceId: string,
  params: any
): Promise<ActionResult> {
  try {
    const { opportunityIds } = params;
    const results = await Promise.allSettled(
      opportunityIds.map((id: string) => opportunityApi.deleteOpportunity(workspaceId, id))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;

    return {
      success: failCount === 0,
      message: `Deleted ${successCount} opportunit${successCount !== 1 ? 'ies' : 'y'}${failCount > 0 ? `, ${failCount} failed` : ''
        }`,
      data: { successCount, failCount },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to bulk delete opportunities',
      error: error.message,
    };
  }
}
