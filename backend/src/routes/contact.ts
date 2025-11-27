import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Contact from "../models/Contact";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createContactSchema,
  updateContactSchema,
  contactQuerySchema,
} from "../validations/contact";

const router = express.Router();

// Rate limiter for contact operations
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/workspaces/:workspaceId/contacts
 * @desc    Create new contact
 * @access  Private
 */
router.post(
  "/:workspaceId/contacts",
  authenticate,
  contactLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Validate workspace exists and user has access
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

      // Validate input
      const validatedData = createContactSchema.parse(req.body);

      // Create contact
      const contact = await Contact.create({
        ...validatedData,
        workspaceId,
        userId: req.user?._id,
      });

      res.status(201).json({
        success: true,
        message: "Contact created successfully!",
        data: {
          contact,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Create contact error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create contact. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/contacts
 * @desc    Get all contacts for a workspace
 * @access  Private
 */
router.get(
  "/:workspaceId/contacts",
  authenticate,
  contactLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Validate workspace exists and user has access
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

      // Parse and validate query parameters
      const queryParams = contactQuerySchema.parse(req.query);
      const page = parseInt(queryParams.page);
      const limit = parseInt(queryParams.limit);
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = { workspaceId };

      if (queryParams.status) {
        filter.status = queryParams.status;
      }

      if (queryParams.assignedTo) {
        filter.assignedTo = queryParams.assignedTo;
      }

      if (queryParams.tags) {
        const tags = queryParams.tags.split(",").map((t) => t.trim());
        filter.tags = { $in: tags };
      }

      // Search functionality
      if (queryParams.search) {
        filter.$or = [
          { firstName: { $regex: queryParams.search, $options: "i" } },
          { lastName: { $regex: queryParams.search, $options: "i" } },
          { email: { $regex: queryParams.search, $options: "i" } },
          { company: { $regex: queryParams.search, $options: "i" } },
        ];
      }

      // Get contacts with pagination
      const [contacts, total] = await Promise.all([
        Contact.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("assignedTo", "name email"),
        Contact.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          contacts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        });
      }

      console.error("Get contacts error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch contacts. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/contacts/:id
 * @desc    Get single contact
 * @access  Private
 */
router.get(
  "/:workspaceId/contacts/:id",
  authenticate,
  contactLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace exists and user has access
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

      // Find contact
      const contact = await Contact.findOne({
        _id: id,
        workspaceId,
      }).populate("assignedTo", "name email");

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: "Contact not found.",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          contact,
        },
      });
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid contact ID format.",
        });
      }

      console.error("Get contact error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch contact. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/contacts/:id
 * @desc    Update contact
 * @access  Private
 */
router.patch(
  "/:workspaceId/contacts/:id",
  authenticate,
  contactLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace exists and user has access
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

      // Validate input
      const validatedData = updateContactSchema.parse(req.body);

      // Handle custom fields separately to merge them properly
      let updateData: any = { ...validatedData };
      if (validatedData.customFields) {
        // Get existing contact to merge custom fields
        const existingContact = await Contact.findOne({ _id: id, workspaceId });
        if (existingContact) {
          // Merge custom fields
          const mergedCustomFields = new Map(existingContact.customFields || new Map());
          Object.entries(validatedData.customFields).forEach(([key, value]) => {
            mergedCustomFields.set(key, value);
          });
          updateData.customFields = mergedCustomFields;
        }
      }

      // Update contact
      const contact = await Contact.findOneAndUpdate(
        { _id: id, workspaceId },
        updateData,
        { new: true, runValidators: true }
      ).populate("assignedTo", "name email");

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: "Contact not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Contact updated successfully!",
        data: {
          contact,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid contact ID format.",
        });
      }

      console.error("Update contact error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update contact. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/contacts/:id
 * @desc    Delete contact
 * @access  Private
 */
router.delete(
  "/:workspaceId/contacts/:id",
  authenticate,
  contactLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace exists and user has access
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

      // Delete contact
      const contact = await Contact.findOneAndDelete({
        _id: id,
        workspaceId,
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: "Contact not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Contact deleted successfully!",
      });
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid contact ID format.",
        });
      }

      console.error("Delete contact error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete contact. Please try again.",
      });
    }
  }
);

export default router;
