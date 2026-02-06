import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import CustomFieldDefinition from "../models/CustomFieldDefinition";
import Contact from "../models/Contact";
import Company from "../models/Company";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
} from "../validations/customField";
import { clearWorkspaceCache } from "../services/AgentCopilotService"; // Story 4.6 Issue #3 Fix

const router = express.Router();

// Rate limiter for custom field operations
const customFieldLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper function to verify workspace access
 */
async function verifyWorkspaceAccess(
  workspaceId: string,
  userId: string,
  res: Response
): Promise<boolean> {
  const workspace = await Project.findById(workspaceId);
  if (!workspace) {
    res.status(404).json({
      success: false,
      error: "Workspace not found.",
    });
    return false;
  }

  if (workspace.userId.toString() !== userId) {
    res.status(403).json({
      success: false,
      error: "You do not have permission to access this workspace.",
    });
    return false;
  }

  return true;
}

/**
 * Helper function to generate field key from label
 */
function generateFieldKey(label: string): string {
  return (
    "custom_" +
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .substring(0, 40)
  );
}

/**
 * @route   POST /api/workspaces/:workspaceId/custom-fields
 * @desc    Create new custom field definition
 * @access  Private
 */
router.post(
  "/:workspaceId/custom-fields",
  authenticate,
  customFieldLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      console.log("🟢 CREATE CUSTOM FIELD ROUTE HIT");
      console.log("Workspace ID:", req.params.workspaceId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("User:", req.user?._id);

      const { workspaceId } = req.params;
      const userId = (req.user?._id as any).toString();

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
      if (!hasAccess) {
        console.log("❌ Workspace access denied");
        return;
      }
      console.log("✅ Workspace access granted");

      // Validate request body
      const validation = createCustomFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.errors[0].message,
          details: validation.error.errors,
        });
      }

      const data = validation.data;

      // Ensure entityType is provided
      if (!data.entityType) {
        return res.status(400).json({
          success: false,
          error: "Entity type is required. Must be 'contact' or 'company'.",
        });
      }

      // Generate field key from label
      const fieldKey = generateFieldKey(data.fieldLabel);

      // Check if field key already exists for this workspace and entity type
      const existingField = await CustomFieldDefinition.findOne({
        workspaceId,
        entityType: data.entityType,
        fieldKey,
      });

      if (existingField) {
        return res.status(409).json({
          success: false,
          error: "A custom field with this name already exists. Please choose a different name.",
        });
      }

      // Get the highest order number to append new field at the end
      const highestOrderField = await CustomFieldDefinition.findOne({
        workspaceId,
        entityType: data.entityType,
        isActive: true,
      }).sort({ order: -1 });

      const order = data.order !== undefined ? data.order : (highestOrderField?.order ?? -1) + 1;

      // Create custom field definition
      const customField = new CustomFieldDefinition({
        workspaceId,
        entityType: data.entityType,
        fieldKey,
        fieldLabel: data.fieldLabel,
        fieldType: data.fieldType,
        selectOptions: data.selectOptions,
        isRequired: data.isRequired,
        defaultValue: data.defaultValue,
        order,
        isActive: true,
      });

      await customField.save();

      // Story 4.6 Issue #3 Fix: Invalidate workspace cache when custom field created
      clearWorkspaceCache();

      res.status(201).json({
        success: true,
        data: {
          customField: customField.toObject(),
        },
        message: "Custom field created successfully.",
      });
    } catch (error: any) {
      console.error("Error creating custom field:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create custom field. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/custom-fields
 * @desc    Get all custom field definitions for a workspace
 * @access  Private
 */
router.get(
  "/:workspaceId/custom-fields",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { includeInactive, entityType } = req.query;
      const userId = (req.user?._id as any).toString();

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
      if (!hasAccess) return;

      // Build query
      const query: any = { workspaceId };

      // Add entityType filter (default to "contact" for backward compatibility)
      query.entityType = entityType || "contact";

      if (includeInactive !== "true") {
        query.isActive = true;
      }

      // Fetch custom fields, sorted by order
      const customFields = await CustomFieldDefinition.find(query).sort({ order: 1 });

      res.status(200).json({
        success: true,
        data: {
          customFields: customFields.map((field) => field.toObject()),
          count: customFields.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching custom fields:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch custom fields. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/custom-fields/:fieldId
 * @desc    Get a single custom field definition
 * @access  Private
 */
router.get(
  "/:workspaceId/custom-fields/:fieldId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, fieldId } = req.params;
      const userId = (req.user?._id as any).toString();

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
      if (!hasAccess) return;

      // Fetch custom field
      const customField = await CustomFieldDefinition.findOne({
        _id: fieldId,
        workspaceId,
      });

      if (!customField) {
        return res.status(404).json({
          success: false,
          error: "Custom field not found.",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          customField: customField.toObject(),
        },
      });
    } catch (error: any) {
      console.error("Error fetching custom field:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch custom field. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/custom-fields/:fieldId
 * @desc    Update a custom field definition
 * @access  Private
 */
router.patch(
  "/:workspaceId/custom-fields/:fieldId",
  authenticate,
  customFieldLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, fieldId } = req.params;
      const userId = (req.user?._id as any).toString();

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
      if (!hasAccess) return;

      // Validate request body
      const validation = updateCustomFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.errors[0].message,
          details: validation.error.errors,
        });
      }

      const data = validation.data;

      // Fetch existing custom field
      const customField = await CustomFieldDefinition.findOne({
        _id: fieldId,
        workspaceId,
      });

      if (!customField) {
        return res.status(404).json({
          success: false,
          error: "Custom field not found.",
        });
      }

      // Update allowed fields
      if (data?.fieldLabel !== undefined) {
        customField.fieldLabel = data.fieldLabel;
      }
      if (data?.selectOptions !== undefined) {
        customField.selectOptions = data.selectOptions;
      }
      if (data?.isRequired !== undefined) {
        customField.isRequired = data.isRequired;
      }
      if (data?.order !== undefined) {
        customField.order = data.order;
      }
      if (data?.isActive !== undefined) {
        customField.isActive = data.isActive;
      }

      await customField.save();

      // Story 4.6 Issue #3 Fix: Invalidate workspace cache when custom field updated
      clearWorkspaceCache();

      res.status(200).json({
        success: true,
        data: {
          customField: customField.toObject(),
        },
        message: "Custom field updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating custom field:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update custom field. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/custom-fields/:fieldId
 * @desc    Delete a custom field definition
 * @access  Private
 */
router.delete(
  "/:workspaceId/custom-fields/:fieldId",
  authenticate,
  customFieldLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, fieldId } = req.params;
      const { deleteData } = req.query;
      const userId = (req.user?._id as any).toString();

      // Verify workspace access
      const hasAccess = await verifyWorkspaceAccess(workspaceId, userId, res);
      if (!hasAccess) return;

      // Fetch custom field
      const customField = await CustomFieldDefinition.findOne({
        _id: fieldId,
        workspaceId,
      });

      if (!customField) {
        return res.status(404).json({
          success: false,
          error: "Custom field not found.",
        });
      }

      if (deleteData === "true") {
        // Hard delete: Remove from all entities and delete definition
        const fieldKey = customField.fieldKey;
        const entityType = customField.entityType;

        // Remove the custom field from all entities (Contact or Company)
        const Model = entityType === "contact" ? Contact : Company;
        await Model.updateMany(
          { workspaceId },
          { $unset: { [`customFields.${fieldKey}`]: "" } }
        );

        // Delete the definition
        await CustomFieldDefinition.findByIdAndDelete(fieldId);

        // Story 4.6 Issue #3 Fix: Invalidate workspace cache when custom field deleted
        clearWorkspaceCache();

        res.status(200).json({
          success: true,
          message: "Custom field and all associated data deleted successfully.",
        });
      } else {
        // Soft delete: Just mark as inactive
        customField.isActive = false;
        await customField.save();

        // Story 4.6 Issue #3 Fix: Invalidate workspace cache when custom field deactivated
        clearWorkspaceCache();

        res.status(200).json({
          success: true,
          data: {
            customField: customField.toObject(),
          },
          message: "Custom field deactivated successfully. Data has been preserved.",
        });
      }
    } catch (error: any) {
      console.error("Error deleting custom field:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete custom field. Please try again.",
      });
    }
  }
);

export default router;
