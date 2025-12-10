/**
 * Apollo Enrich Action
 * 
 * Workflow action to enrich contacts using Apollo.io API.
 */

import ApolloService from "../../ApolloService";
import { ActionContext, ActionResult, ActionExecutor } from "./types";
import Contact from "../../../models/Contact";
import { Types } from "mongoose";

// ============================================
// APOLLO ENRICH ACTION
// ============================================

class ApolloEnrichActionExecutor implements ActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, workspaceId } = context;
        const config = step.config || {};
        const enrichType = config.enrichType || "person";

        // Check if Apollo is configured
        if (!ApolloService.isConfigured()) {
            return {
                success: false,
                error: "Apollo API key not configured. Add APOLLO_API_KEY to your environment.",
            };
        }

        try {
            // Determine entity type from context
            const entityType = this.getEntityType(entity);

            if (enrichType === "person" && entityType === "contact") {
                return await this.enrichPerson(entity._id.toString(), workspaceId);
            }

            if (enrichType === "company" && entityType === "company") {
                return await this.enrichCompany(entity._id.toString());
            }

            if (enrichType === "linkedin_to_email" && entityType === "contact") {
                return await this.findEmailFromLinkedIn(entity);
            }

            return {
                success: false,
                error: `Invalid enrichType '${enrichType}' for entityType '${entityType}'`,
            };
        } catch (error: any) {
            console.error("Apollo enrich action error:", error);
            return {
                success: false,
                error: error.message || "Apollo enrichment failed",
            };
        }
    }

    private getEntityType(entity: any): string {
        // Detect entity type from model name or properties
        if (entity.constructor?.modelName) {
            return entity.constructor.modelName.toLowerCase();
        }
        if (entity.firstName !== undefined || entity.lastName !== undefined) {
            return "contact";
        }
        if (entity.industry !== undefined && !entity.firstName) {
            return "company";
        }
        return "unknown";
    }

    private async enrichPerson(entityId: string, workspaceId: Types.ObjectId | string): Promise<ActionResult> {
        const wsId = typeof workspaceId === "string"
            ? new Types.ObjectId(workspaceId)
            : workspaceId;

        const result = await ApolloService.enrichContact(entityId, wsId);

        if (result.success) {
            return {
                success: true,
                data: {
                    enrichedFields: result.data?.enrichedFields || [],
                    creditsUsed: result.creditsUsed,
                },
            };
        } else {
            return {
                success: false,
                error: result.error || "Enrichment failed",
            };
        }
    }

    private async enrichCompany(entityId: string): Promise<ActionResult> {
        const result = await ApolloService.enrichCompanyRecord(entityId);

        if (result.success) {
            return {
                success: true,
                data: {
                    enrichedFields: result.data?.enrichedFields || [],
                    creditsUsed: result.creditsUsed,
                },
            };
        } else {
            return {
                success: false,
                error: result.error || "Enrichment failed",
            };
        }
    }

    private async findEmailFromLinkedIn(entity: any): Promise<ActionResult> {
        const linkedinUrl = entity.linkedin;
        if (!linkedinUrl) {
            return { success: false, error: "Contact has no LinkedIn URL" };
        }

        const result = await ApolloService.findEmailFromLinkedIn(linkedinUrl);

        if (result.success && result.data?.email) {
            // Update contact with found email
            await Contact.findByIdAndUpdate(entity._id, {
                $set: {
                    email: result.data.email,
                    "enrichment.source": "apollo",
                    "enrichment.enrichedAt": new Date(),
                },
                $addToSet: {
                    "enrichment.fieldsEnriched": "email",
                },
            });

            return {
                success: true,
                data: {
                    email: result.data.email,
                    emailStatus: result.data.emailStatus,
                    creditsUsed: result.creditsUsed,
                },
            };
        } else {
            return {
                success: false,
                error: result.error || "No email found for this LinkedIn profile",
            };
        }
    }
}

export default new ApolloEnrichActionExecutor();
