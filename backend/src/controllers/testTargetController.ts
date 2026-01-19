import { Request, Response } from 'express';
import Contact from '../models/Contact';
import Opportunity from '../models/Opportunity';

/**
 * Test Target Controller - Story 2.2: Select Test Target
 *
 * Provides searchable lists of contacts and deals for test mode target selection.
 * All queries enforce workspace isolation for security.
 */

/**
 * @route GET /api/workspaces/:workspaceId/test-targets/contacts
 * @desc Search contacts in workspace for test target selection
 * @access Private (requires authentication and workspace access)
 *
 * Query Params:
 * - search: Optional search string (searches firstName, lastName, email, company)
 * - limit: Max results (default 20, max 50)
 *
 * Response:
 * - targets: Array of { id, name, subtitle, company }
 * - hasMore: Boolean indicating if more results exist
 */
export const searchContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { search, limit = '20' } = req.query;

    // Validate and cap limit
    const parsedLimit = Math.min(parseInt(limit as string, 10) || 20, 50);

    // Build query with workspace isolation (CRITICAL)
    const query: Record<string, any> = { workspaceId };

    // Add search filter if provided
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { company: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Query contacts with minimal fields for selection
    const contacts = await Contact.find(query)
      .select('_id firstName lastName email company')
      .populate('companyId', 'name')
      .limit(parsedLimit + 1) // Fetch one extra to check hasMore
      .sort({ createdAt: -1 });

    // Determine if there are more results
    const hasMore = contacts.length > parsedLimit;
    const results = hasMore ? contacts.slice(0, parsedLimit) : contacts;

    // Transform to target format
    const targets = results.map((contact) => ({
      id: contact._id.toString(),
      name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      subtitle: contact.email || '',
      company: (contact as any).companyId?.name || contact.company || '',
    }));

    res.status(200).json({
      success: true,
      targets,
      hasMore,
    });
  } catch (error: any) {
    console.error('Error searching contacts for test targets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search contacts',
    });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/test-targets/deals
 * @desc Search deals (opportunities) in workspace for test target selection
 * @access Private (requires authentication and workspace access)
 *
 * Query Params:
 * - search: Optional search string (searches title, company name)
 * - limit: Max results (default 20, max 50)
 *
 * Response:
 * - targets: Array of { id, name, subtitle, company }
 * - hasMore: Boolean indicating if more results exist
 */
export const searchDeals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { search, limit = '20' } = req.query;

    // Validate and cap limit
    const parsedLimit = Math.min(parseInt(limit as string, 10) || 20, 50);

    // Build query with workspace isolation (CRITICAL)
    const query: Record<string, any> = { workspaceId };

    // Add search filter if provided - search in title field directly
    // Company name search requires aggregation, so we do title-only search for performance
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      query.title = { $regex: searchTerm, $options: 'i' };
    }

    // Query deals with minimal fields for selection
    const deals = await Opportunity.find(query)
      .select('_id title value currency companyId')
      .populate('companyId', 'name')
      .limit(parsedLimit + 1) // Fetch one extra to check hasMore
      .sort({ createdAt: -1 });

    // Determine if there are more results
    const hasMore = deals.length > parsedLimit;
    const results = hasMore ? deals.slice(0, parsedLimit) : deals;

    // Transform to target format with formatted value
    const targets = results.map((deal) => {
      const formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: deal.currency || 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(deal.value);

      return {
        id: deal._id.toString(),
        name: deal.title,
        subtitle: formattedValue,
        company: (deal as any).companyId?.name || '',
      };
    });

    res.status(200).json({
      success: true,
      targets,
      hasMore,
    });
  } catch (error: any) {
    console.error('Error searching deals for test targets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search deals',
    });
  }
};
