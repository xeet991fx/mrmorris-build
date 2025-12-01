/**
 * Action Executor
 * Executes parsed actions by calling the appropriate API endpoints
 */

import * as contactApi from '@/lib/api/contact';
import * as companyApi from '@/lib/api/company';
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
      message: 'Invalid action parameters',
      error: validation.errors.join(', '),
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
        message: `Contact created: ${params.firstName || ''} ${params.lastName || ''}`.trim(),
        data: response.data.contact,
      };
    }

    return {
      success: false,
      message: 'Failed to create contact',
      error: response.error,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to create contact',
      error: error.message,
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
      message: `Updated ${successCount} contact${successCount !== 1 ? 's' : ''}${
        failCount > 0 ? `, ${failCount} failed` : ''
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
      message: `Deleted ${successCount} contact${successCount !== 1 ? 's' : ''}${
        failCount > 0 ? `, ${failCount} failed` : ''
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
