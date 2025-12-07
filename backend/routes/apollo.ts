import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import apolloService from '../services/ApolloService';
import Contact from '../src/models/Contact';
import Company from '../src/models/Company';
import { requireAuth } from '../src/middleware/auth';
import { validateWorkspaceAccess } from '../src/middleware/workspace';
import { apolloRateLimit } from '../src/middleware/apollo-rate-limit';
import { logger } from '../src/utils/logger';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ZOD VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

const enrichContactSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
});

const searchPeopleSchema = z.object({
  jobTitles: z.array(z.string()).optional(),
  companyDomains: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  companySizes: z.array(z.string()).optional(),
  seniorities: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

const enrichCompanySchema = z.object({
  companyId: z.string().optional(),
  domain: z.string().optional(),
}).refine((data) => data.companyId || data.domain, {
  message: 'Either companyId or domain must be provided',
});

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const bulkEnrichSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact ID is required').max(1000, 'Maximum 1000 contacts at a time'),
});

const importContactsSchema = z.object({
  searchCriteria: z.object({
    jobTitles: z.array(z.string()).optional(),
    companyDomains: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    companySizes: z.array(z.string()).optional(),
    seniorities: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    limit: z.number().min(1).max(50).optional(),
  }),
  createContacts: z.boolean().default(true),
  assignToUserId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/workspaces/:workspaceId/apollo/enrich-contact
 * Enrich a single contact with Apollo data
 */
router.post(
  '/:workspaceId/apollo/enrich-contact',
  requireAuth,
  validateWorkspaceAccess,
  apolloRateLimit,
  validateRequest(enrichContactSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId } = req.body;
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();

      // Verify contact exists and belongs to workspace
      const contact = await Contact.findOne({ _id: contactId, workspace: workspaceId });
      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found or does not belong to this workspace',
        });
      }

      // Check if contact was recently enriched (within last 30 days)
      if (contact.apolloEnrichment?.enrichedAt) {
        const daysSinceEnrichment = Math.floor(
          (Date.now() - contact.apolloEnrichment.enrichedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceEnrichment < 30) {
          return res.status(200).json({
            success: true,
            data: contact,
            creditsUsed: 0,
            message: `Contact was enriched ${daysSinceEnrichment} days ago. No credits charged.`,
            alreadyEnriched: true,
          });
        }
      }

      const result = await apolloService.enrichContact(contactId, workspaceId, userId);

      res.status(200).json({
        success: true,
        data: result.contact,
        creditsUsed: result.creditsUsed,
        fieldsEnriched: result.fieldsEnriched,
        confidence: result.confidence,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/apollo/search
 * Search for people in Apollo database
 */
router.post(
  '/:workspaceId/apollo/search',
  requireAuth,
  validateWorkspaceAccess,
  apolloRateLimit,
  validateRequest(searchPeopleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();
      const searchParams = req.body;

      const result = await apolloService.searchPeople(searchParams, workspaceId, userId);

      res.status(200).json({
        success: true,
        results: result.people,
        pagination: result.pagination,
        count: result.people.length,
        creditsUsed: result.creditsUsed,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/apollo/enrich-company
 * Enrich company information
 */
router.post(
  '/:workspaceId/apollo/enrich-company',
  requireAuth,
  validateWorkspaceAccess,
  apolloRateLimit,
  validateRequest(enrichCompanySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId, domain } = req.body;
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();

      let companyDomain = domain;

      // If companyId provided, get the company first
      if (companyId) {
        const company = await Company.findOne({ _id: companyId, workspace: workspaceId });
        if (!company) {
          return res.status(404).json({
            success: false,
            error: 'Company not found or does not belong to this workspace',
          });
        }

        if (!company.website && !domain) {
          return res.status(400).json({
            success: false,
            error: 'Company does not have a website. Please provide a domain.',
          });
        }

        companyDomain = company.website || domain;
      }

      if (!companyDomain) {
        return res.status(400).json({
          success: false,
          error: 'Domain is required',
        });
      }

      const apolloCompany = await apolloService.getCompany(companyDomain, workspaceId, userId);

      // Update company if companyId was provided
      if (companyId && apolloCompany) {
        const company = await Company.findById(companyId);
        if (company) {
          // Update company fields
          if (apolloCompany.name) company.name = apolloCompany.name;
          if (apolloCompany.industry) company.industry = apolloCompany.industry;
          if (apolloCompany.estimated_num_employees) company.size = apolloCompany.estimated_num_employees.toString();
          if (apolloCompany.website_url) company.website = apolloCompany.website_url;
          if (apolloCompany.linkedin_url && !company.socialProfiles?.linkedin) {
            if (!company.socialProfiles) company.socialProfiles = {};
            company.socialProfiles.linkedin = apolloCompany.linkedin_url;
          }
          if (apolloCompany.twitter_url && !company.socialProfiles?.twitter) {
            if (!company.socialProfiles) company.socialProfiles = {};
            company.socialProfiles.twitter = apolloCompany.twitter_url;
          }
          if (apolloCompany.street_address || apolloCompany.city || apolloCompany.state || apolloCompany.country) {
            if (!company.address) company.address = {};
            if (apolloCompany.street_address) company.address.street = apolloCompany.street_address;
            if (apolloCompany.city) company.address.city = apolloCompany.city;
            if (apolloCompany.state) company.address.state = apolloCompany.state;
            if (apolloCompany.postal_code) company.address.postalCode = apolloCompany.postal_code;
            if (apolloCompany.country) company.address.country = apolloCompany.country;
          }

          await company.save();

          return res.status(200).json({
            success: true,
            data: company,
            apolloData: apolloCompany,
            creditsUsed: 1,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: apolloCompany,
        creditsUsed: 1,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/apollo/verify-email
 * Verify email validity
 */
router.post(
  '/:workspaceId/apollo/verify-email',
  requireAuth,
  validateWorkspaceAccess,
  apolloRateLimit,
  validateRequest(verifyEmailSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();

      const verification = await apolloService.verifyEmail(email, workspaceId, userId);

      res.status(200).json({
        success: true,
        data: verification,
        valid: verification.status === 'valid',
        status: verification.status,
        creditsUsed: 1,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/apollo/bulk-enrich
 * Bulk enrich multiple contacts
 */
router.post(
  '/:workspaceId/apollo/bulk-enrich',
  requireAuth,
  validateWorkspaceAccess,
  apolloRateLimit,
  validateRequest(bulkEnrichSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactIds } = req.body;
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();

      // Verify all contacts exist and belong to workspace
      const contacts = await Contact.find({
        _id: { $in: contactIds },
        workspace: workspaceId,
      });

      if (contacts.length !== contactIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Some contacts not found or do not belong to this workspace',
          found: contacts.length,
          requested: contactIds.length,
        });
      }

      // Start bulk enrichment (this will run in background)
      const result = await apolloService.bulkEnrich(contactIds, workspaceId, userId);

      res.status(200).json({
        success: true,
        enriched: result.enriched,
        failed: result.failed,
        totalCreditsUsed: result.totalCreditsUsed,
        results: result.results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/apollo/credits
 * Get remaining Apollo credits
 */
router.get(
  '/:workspaceId/apollo/credits',
  requireAuth,
  validateWorkspaceAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();

      const credits = await apolloService.getCreditsRemaining(workspaceId, userId);

      res.status(200).json({
        success: true,
        remaining: credits.remaining,
        limit: credits.limit,
        resetDate: credits.resetDate,
        usedThisMonth: credits.usedThisMonth,
        percentageUsed: credits.limit > 0 ? Math.round((credits.usedThisMonth / credits.limit) * 100) : 0,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/apollo/import
 * Search Apollo and import contacts to CRM
 */
router.post(
  '/:workspaceId/apollo/import',
  requireAuth,
  validateWorkspaceAccess,
  apolloRateLimit,
  validateRequest(importContactsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { searchCriteria, createContacts, assignToUserId, tags } = req.body;
      const { workspaceId } = req.params;
      const userId = req.user!._id.toString();

      // Search Apollo
      const searchResult = await apolloService.searchPeople(searchCriteria, workspaceId, userId);

      if (!createContacts) {
        // Just return the search results without creating contacts
        return res.status(200).json({
          success: true,
          imported: 0,
          contacts: [],
          searchResults: searchResult.people,
          creditsUsed: searchResult.creditsUsed,
        });
      }

      // Create contacts from search results
      const importedContacts = [];
      const errors = [];

      for (const person of searchResult.people) {
        try {
          // Check if contact already exists (by email or name + company)
          const existingContact = person.email
            ? await Contact.findOne({ email: person.email, workspace: workspaceId })
            : await Contact.findOne({
                firstName: person.first_name,
                lastName: person.last_name,
                workspace: workspaceId,
              });

          if (existingContact) {
            errors.push({
              person: `${person.first_name} ${person.last_name}`,
              error: 'Contact already exists',
            });
            continue;
          }

          // Find or create company
          let company = null;
          if (person.organization && person.organization.primary_domain) {
            company = await Company.findOne({
              website: { $regex: new RegExp(person.organization.primary_domain, 'i') },
              workspace: workspaceId,
            });

            if (!company) {
              company = await Company.create({
                workspace: workspaceId,
                name: person.organization.name,
                website: person.organization.website_url,
                industry: person.organization.industry,
                size: person.organization.estimated_num_employees?.toString(),
                createdBy: userId,
              });
            }
          }

          // Create contact
          const newContact = await Contact.create({
            workspace: workspaceId,
            firstName: person.first_name,
            lastName: person.last_name,
            email: person.email,
            phone: person.phone_numbers?.[0]?.sanitized_number,
            title: person.title,
            company: company?._id,
            location: {
              city: person.city,
              state: person.state,
              country: person.country,
            },
            socialProfiles: {
              linkedin: person.linkedin_url,
              twitter: person.twitter_url,
            },
            apolloEnrichment: {
              enrichedAt: new Date(),
              apolloId: person.id,
              confidence: person.email_status === 'verified' ? 0.95 : 0.75,
              dataSource: 'apollo',
              fieldsEnriched: ['email', 'phone', 'title', 'location', 'linkedin'],
              creditsUsed: 0, // Already counted in search
            },
            owner: assignToUserId || userId,
            tags: tags || [],
            createdBy: userId,
          });

          importedContacts.push(newContact);
        } catch (error) {
          errors.push({
            person: `${person.first_name} ${person.last_name}`,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.status(200).json({
        success: true,
        imported: importedContacts.length,
        contacts: importedContacts,
        errors: errors.length > 0 ? errors : undefined,
        creditsUsed: searchResult.creditsUsed,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/apollo/test-connection
 * Test Apollo API connection
 */
router.get(
  '/:workspaceId/apollo/test-connection',
  requireAuth,
  validateWorkspaceAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isConnected = await apolloService.testConnection();

      res.status(200).json({
        success: true,
        connected: isConnected,
        message: isConnected
          ? 'Apollo API connection successful'
          : 'Apollo API connection failed. Please check your API key.',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Apollo API route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle specific Apollo errors
  if (error.name === 'InvalidAPIKeyError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Apollo API key',
      message: 'Please check your Apollo API key configuration.',
      code: 'INVALID_API_KEY',
    });
  }

  if (error.name === 'InsufficientCreditsError') {
    return res.status(403).json({
      success: false,
      error: 'Insufficient Apollo credits',
      message: 'You have run out of Apollo credits. Please upgrade your plan.',
      code: 'INSUFFICIENT_CREDITS',
    });
  }

  if (error.name === 'RateLimitError') {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests to Apollo API. Please try again later.',
      retryAfter: error.retryAfter || 60,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  if (error.name === 'PersonNotFoundError' || error.name === 'CompanyNotFoundError') {
    return res.status(404).json({
      success: false,
      error: error.message,
      code: 'NOT_FOUND',
    });
  }

  if (error.name === 'ApolloAPIError') {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      code: error.apolloErrorCode || 'APOLLO_API_ERROR',
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  });
});

export default router;
