/**
 * Report Sources Discovery API
 *
 * Powers the Data-First Report Builder UI
 * Returns available entities, attributes, custom fields, and relationships
 * for dynamic report configuration
 */

import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Project from "../models/Project";
import Pipeline from "../models/Pipeline";
import CustomFieldDefinition from "../models/CustomFieldDefinition";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

const sourcesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});

/**
 * @route   GET /api/workspaces/:workspaceId/report-sources
 * @desc    Get all available report data sources with attributes and custom fields
 * @access  Private
 */
router.get(
  "/:workspaceId/report-sources",
  authenticate,
  sourcesLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Validate workspace access
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Get pipelines for opportunity source
      const pipelines = await Pipeline.find({
        workspaceId,
        isActive: true,
      }).select("_id name stages");

      // Get custom field definitions by entity type
      const customFieldDefinitions = await CustomFieldDefinition.find({
        workspaceId,
        isActive: true,
      }).select("fieldLabel fieldKey fieldType entityType");

      // Group custom fields by entity type
      const customFieldsByEntity: Record<string, any[]> = {};
      customFieldDefinitions.forEach((field) => {
        // Map "deal" to "opportunity" for consistency
        const entityType = field.entityType === "deal" ? "opportunity" : field.entityType;
        if (!customFieldsByEntity[entityType]) {
          customFieldsByEntity[entityType] = [];
        }

        let aggregations: string[] = [];
        if (field.fieldType === "number" || field.fieldType === "currency") {
          aggregations = ["sum", "avg", "min", "max"];
        }

        customFieldsByEntity[entityType].push({
          field: `customFields.${field.fieldKey}`,
          label: field.fieldLabel,
          type: field.fieldType,
          aggregations,
          groupable: field.fieldType === "select" || field.fieldType === "multiselect",
        });
      });

      // Define source configurations
      const sources = [
        {
          entity: "opportunity",
          label: "Deals",
          attributes: [
            {
              field: "value",
              label: "Deal Value",
              type: "number",
              aggregations: ["sum", "avg", "min", "max"],
              groupable: false,
            },
            {
              field: "probability",
              label: "Probability",
              type: "number",
              aggregations: ["avg", "min", "max"],
              groupable: false,
            },
            {
              field: "stageId",
              label: "Stage",
              type: "select",
              groupable: true,
              aggregations: [],
            },
            {
              field: "status",
              label: "Status",
              type: "select",
              groupable: true,
              options: ["open", "won", "lost", "abandoned"],
              aggregations: [],
            },
            {
              field: "source",
              label: "Source",
              type: "string",
              groupable: true,
              aggregations: [],
            },
            {
              field: "assignedTo",
              label: "Owner",
              type: "user",
              groupable: true,
              aggregations: [],
            },
            {
              field: "priority",
              label: "Priority",
              type: "select",
              groupable: true,
              options: ["low", "medium", "high"],
              aggregations: [],
            },
            {
              field: "dealTemperature",
              label: "Temperature",
              type: "select",
              groupable: true,
              options: ["hot", "warm", "cold"],
              aggregations: [],
            },
            {
              field: "createdAt",
              label: "Created Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "expectedCloseDate",
              label: "Expected Close Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "actualCloseDate",
              label: "Actual Close Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
          ],
          customFields: customFieldsByEntity.opportunity || [],
          pipelines: pipelines.map((p) => ({
            id: p._id.toString(),
            name: p.name,
            stages: p.stages.map((s) => ({
              id: s._id.toString(),
              name: s.name,
              order: s.order,
            })),
          })),
          relationships: [
            {
              entity: "company",
              label: "Company",
              foreignField: "companyId",
            },
            {
              entity: "contact",
              label: "Contact",
              foreignField: "contactId",
            },
          ],
          supportsEvents: true, // Can use StageChangeEvent for advanced reports
        },
        {
          entity: "contact",
          label: "Contacts",
          attributes: [
            {
              field: "firstName",
              label: "First Name",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "lastName",
              label: "Last Name",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "email",
              label: "Email",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "status",
              label: "Status",
              type: "select",
              groupable: true,
              options: ["lead", "prospect", "customer", "inactive", "disqualified"],
              aggregations: [],
            },
            {
              field: "lifecycleStage",
              label: "Lifecycle Stage",
              type: "select",
              groupable: true,
              options: ["subscriber", "lead", "mql", "sql", "sal", "opportunity", "customer", "evangelist", "churned", "disqualified"],
              aggregations: [],
            },
            {
              field: "leadScore",
              label: "Lead Score",
              type: "number",
              aggregations: ["avg", "min", "max"],
              groupable: false,
            },
            {
              field: "source",
              label: "Source",
              type: "string",
              groupable: true,
              aggregations: [],
            },
            {
              field: "createdAt",
              label: "Created Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
          ],
          customFields: customFieldsByEntity.contact || [],
          relationships: [
            {
              entity: "company",
              label: "Company",
              foreignField: "companyId",
            },
          ],
          supportsEvents: false,
        },
        {
          entity: "company",
          label: "Companies",
          attributes: [
            {
              field: "name",
              label: "Company Name",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "industry",
              label: "Industry",
              type: "string",
              groupable: true,
              aggregations: [],
            },
            {
              field: "size",
              label: "Company Size",
              type: "string",
              groupable: true,
              aggregations: [],
            },
            {
              field: "revenue",
              label: "Annual Revenue",
              type: "number",
              aggregations: ["sum", "avg", "min", "max"],
              groupable: false,
            },
            {
              field: "employeeCount",
              label: "Employee Count",
              type: "number",
              aggregations: ["sum", "avg", "min", "max"],
              groupable: false,
            },
            {
              field: "website",
              label: "Website",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "createdAt",
              label: "Created Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
          ],
          customFields: customFieldsByEntity.company || [],
          relationships: [],
          supportsEvents: false,
        },
        {
          entity: "task",
          label: "Tasks",
          attributes: [
            {
              field: "title",
              label: "Task Title",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "status",
              label: "Status",
              type: "select",
              groupable: true,
              options: ["pending", "in_progress", "completed", "cancelled"],
              aggregations: [],
            },
            {
              field: "priority",
              label: "Priority",
              type: "select",
              groupable: true,
              options: ["low", "medium", "high"],
              aggregations: [],
            },
            {
              field: "assignedTo",
              label: "Assigned To",
              type: "user",
              groupable: true,
              aggregations: [],
            },
            {
              field: "dueDate",
              label: "Due Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "createdAt",
              label: "Created Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "completedAt",
              label: "Completed Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
          ],
          customFields: customFieldsByEntity.task || [],
          relationships: [
            {
              entity: "contact",
              label: "Contact",
              foreignField: "contactId",
            },
            {
              entity: "company",
              label: "Company",
              foreignField: "companyId",
            },
            {
              entity: "opportunity",
              label: "Deal",
              foreignField: "opportunityId",
            },
          ],
          supportsEvents: false,
        },
        {
          entity: "ticket",
          label: "Tickets",
          attributes: [
            {
              field: "subject",
              label: "Subject",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "status",
              label: "Status",
              type: "select",
              groupable: true,
              options: ["open", "in_progress", "resolved", "closed"],
              aggregations: [],
            },
            {
              field: "priority",
              label: "Priority",
              type: "select",
              groupable: true,
              options: ["low", "medium", "high", "urgent"],
              aggregations: [],
            },
            {
              field: "category",
              label: "Category",
              type: "string",
              groupable: true,
              aggregations: [],
            },
            {
              field: "assignedTo",
              label: "Assigned To",
              type: "user",
              groupable: true,
              aggregations: [],
            },
            {
              field: "createdAt",
              label: "Created Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "resolvedAt",
              label: "Resolved Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
          ],
          customFields: customFieldsByEntity.ticket || [],
          relationships: [
            {
              entity: "contact",
              label: "Contact",
              foreignField: "contactId",
            },
            {
              entity: "company",
              label: "Company",
              foreignField: "companyId",
            },
          ],
          supportsEvents: false,
        },
        {
          entity: "email",
          label: "Emails",
          attributes: [
            {
              field: "subject",
              label: "Subject",
              type: "string",
              groupable: false,
              aggregations: [],
            },
            {
              field: "status",
              label: "Status",
              type: "select",
              groupable: true,
              options: ["sent", "delivered", "opened", "clicked", "bounced", "failed"],
              aggregations: [],
            },
            {
              field: "direction",
              label: "Direction",
              type: "select",
              groupable: true,
              options: ["inbound", "outbound"],
              aggregations: [],
            },
            {
              field: "sentAt",
              label: "Sent Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "openedAt",
              label: "Opened Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
            {
              field: "clickedAt",
              label: "Clicked Date",
              type: "date",
              groupable: false,
              aggregations: [],
            },
          ],
          customFields: customFieldsByEntity.email || [],
          relationships: [
            {
              entity: "contact",
              label: "Contact",
              foreignField: "contactId",
            },
          ],
          supportsEvents: false,
        },
      ];

      // Populate relationship attributes by looking up related entities
      sources.forEach((source) => {
        if (source.relationships) {
          source.relationships = source.relationships.map((rel: any) => {
            const relatedSource = sources.find((s) => s.entity === rel.entity);
            return {
              ...rel,
              attributes: relatedSource?.attributes.filter((attr: any) =>
                // Only include filterable attributes (not all attributes)
                attr.type === "string" ||
                attr.type === "select" ||
                attr.type === "number" ||
                attr.type === "date"
              ) || [],
            };
          });
        }
      });

      res.status(200).json({
        success: true,
        data: { sources },
      });
    } catch (error: any) {
      console.error("Get report sources error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch report sources. Please try again.",
      });
    }
  }
);

export default router;
