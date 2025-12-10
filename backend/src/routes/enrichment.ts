/**
 * Enrichment Routes
 * 
 * API routes for contact and company enrichment using Apollo.io
 */

import express from "express";
import ApolloService from "../services/ApolloService";
import { authenticate } from "../middleware/auth";
import { Types } from "mongoose";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/enrichment/status
 * Check Apollo API configuration status
 */
router.get("/status", async (req: any, res) => {
    try {
        const isConfigured = ApolloService.isConfigured();

        res.json({
            success: true,
            configured: isConfigured,
            message: isConfigured
                ? "Apollo API is configured"
                : "Apollo API key not set. Add APOLLO_API_KEY to your environment.",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/person
 * Enrich a person by name/email/LinkedIn
 */
router.post("/person", async (req: any, res) => {
    try {
        const { firstName, lastName, email, linkedinUrl, organizationName, domain } = req.body;

        if (!firstName && !lastName && !email && !linkedinUrl) {
            return res.status(400).json({
                success: false,
                message: "At least one of firstName, lastName, email, or linkedinUrl is required",
            });
        }

        const result = await ApolloService.enrichPerson({
            firstName,
            lastName,
            email,
            linkedinUrl,
            organizationName,
            domain,
        });

        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                creditsUsed: result.creditsUsed,
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error,
            });
        }
    } catch (error: any) {
        console.error("Enrich person error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/company
 * Enrich a company by name or domain
 */
router.post("/company", async (req: any, res) => {
    try {
        const { name, domain } = req.body;

        if (!name && !domain) {
            return res.status(400).json({
                success: false,
                message: "Either name or domain is required",
            });
        }

        const result = await ApolloService.enrichCompany({ name, domain });

        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                creditsUsed: result.creditsUsed,
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error,
            });
        }
    } catch (error: any) {
        console.error("Enrich company error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/linkedin-to-email
 * Find email from LinkedIn URL
 */
router.post("/linkedin-to-email", async (req: any, res) => {
    try {
        const { linkedinUrl } = req.body;

        if (!linkedinUrl) {
            return res.status(400).json({
                success: false,
                message: "linkedinUrl is required",
            });
        }

        const result = await ApolloService.findEmailFromLinkedIn(linkedinUrl);

        if (result.success) {
            res.json({
                success: true,
                email: result.data.email,
                emailStatus: result.data.emailStatus,
                person: result.data.person,
                creditsUsed: result.creditsUsed,
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error,
            });
        }
    } catch (error: any) {
        console.error("LinkedIn to email error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/contact/:id
 * Enrich a contact by ID and update database
 */
router.post("/contact/:id", async (req: any, res) => {
    try {
        const { id } = req.params;
        const { workspaceId } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        const result = await ApolloService.enrichContact(
            id,
            new Types.ObjectId(workspaceId)
        );

        if (result.success) {
            res.json({
                success: true,
                contact: result.data.contact,
                enrichedFields: result.data.enrichedFields,
                creditsUsed: result.creditsUsed,
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error,
            });
        }
    } catch (error: any) {
        console.error("Enrich contact error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/company/:id
 * Enrich a company by ID and update database
 */
router.post("/company/:id", async (req: any, res) => {
    try {
        const { id } = req.params;

        const result = await ApolloService.enrichCompanyRecord(id);

        if (result.success) {
            res.json({
                success: true,
                company: result.data.company,
                enrichedFields: result.data.enrichedFields,
                creditsUsed: result.creditsUsed,
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.error,
            });
        }
    } catch (error: any) {
        console.error("Enrich company record error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/bulk
 * Bulk enrich contacts
 */
router.post("/bulk", async (req: any, res) => {
    try {
        const { contactIds, workspaceId } = req.body;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "contactIds array is required",
            });
        }

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "workspaceId is required",
            });
        }

        if (contactIds.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Maximum 50 contacts per bulk request",
            });
        }

        const result = await ApolloService.bulkEnrichContacts(
            contactIds,
            new Types.ObjectId(workspaceId)
        );

        res.json({
            success: true,
            summary: {
                total: contactIds.length,
                enriched: result.success,
                failed: result.failed,
            },
            results: result.results,
        });
    } catch (error: any) {
        console.error("Bulk enrich error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/enrichment/search
 * Search for people using Apollo
 */
router.post("/search", async (req: any, res) => {
    try {
        const {
            personTitles,
            personSeniorities,
            organizationNames,
            organizationIndustries,
            personLocations,
            limit,
            page,
        } = req.body;

        if (!personTitles && !personSeniorities && !organizationNames && !personLocations) {
            return res.status(400).json({
                success: false,
                message: "At least one search filter is required",
            });
        }

        const result = await ApolloService.searchPeople({
            personTitles,
            personSeniorities,
            organizationNames,
            organizationIndustries,
            personLocations,
            limit: limit || 25,
            page: page || 1,
        });

        if (result.success) {
            res.json({
                success: true,
                people: result.data.people,
                pagination: {
                    page: result.data.page,
                    totalPages: result.data.totalPages,
                    totalCount: result.data.totalCount,
                },
                creditsUsed: result.creditsUsed,
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error,
            });
        }
    } catch (error: any) {
        console.error("Search people error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
