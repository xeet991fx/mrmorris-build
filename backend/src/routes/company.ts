import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Company from "../models/Company";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createCompanySchema,
  updateCompanySchema,
  companyQuerySchema,
} from "../validations/company";

const router = express.Router();

// Rate limiter for company operations
const companyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/workspaces/:workspaceId/companies
 * @desc    Create new company
 * @access  Private
 */
router.post(
  "/:workspaceId/companies",
  authenticate,
  companyLimiter,
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
      const validatedData = createCompanySchema.parse(req.body);

      // Create company
      const companyDoc = await Company.create({
        ...validatedData,
        workspaceId,
        userId: req.user?._id,
      });

      // Convert Map to plain object for JSON serialization
      const company: any = companyDoc.toObject();
      if (company.customFields && company.customFields instanceof Map) {
        company.customFields = Object.fromEntries(company.customFields);
      }

      res.status(201).json({
        success: true,
        message: "Company created successfully!",
        data: {
          company,
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

      console.error("Create company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create company. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/companies
 * @desc    Get all companies for a workspace
 * @access  Private
 */
router.get(
  "/:workspaceId/companies",
  authenticate,
  companyLimiter,
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
      const queryParams = companyQuerySchema.parse(req.query);
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

      if (queryParams.industry) {
        filter.industry = { $regex: queryParams.industry, $options: "i" };
      }

      if (queryParams.companySize) {
        filter.companySize = queryParams.companySize;
      }

      // Search functionality
      if (queryParams.search) {
        filter.$or = [
          { name: { $regex: queryParams.search, $options: "i" } },
          { industry: { $regex: queryParams.search, $options: "i" } },
          { website: { $regex: queryParams.search, $options: "i" } },
        ];
      }

      // Get companies with pagination
      const [companyDocs, total] = await Promise.all([
        Company.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("assignedTo", "name email"),
        Company.countDocuments(filter),
      ]);

      // Convert Map to plain object for JSON serialization
      const companies = companyDocs.map((doc) => {
        const obj: any = doc.toObject();
        if (obj.customFields && obj.customFields instanceof Map) {
          obj.customFields = Object.fromEntries(obj.customFields);
        }
        return obj;
      });

      res.status(200).json({
        success: true,
        data: {
          companies,
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

      console.error("Get companies error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch companies. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/companies/:id
 * @desc    Get single company
 * @access  Private
 */
router.get(
  "/:workspaceId/companies/:id",
  authenticate,
  companyLimiter,
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

      // Find company
      const companyDoc = await Company.findOne({
        _id: id,
        workspaceId,
      }).populate("assignedTo", "name email");

      if (!companyDoc) {
        return res.status(404).json({
          success: false,
          error: "Company not found.",
        });
      }

      // Convert Map to plain object for JSON serialization
      const company: any = companyDoc.toObject();
      if (company.customFields && company.customFields instanceof Map) {
        company.customFields = Object.fromEntries(company.customFields);
      }

      res.status(200).json({
        success: true,
        data: {
          company,
        },
      });
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid company ID format.",
        });
      }

      console.error("Get company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch company. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/companies/:id
 * @desc    Update company
 * @access  Private
 */
router.patch(
  "/:workspaceId/companies/:id",
  authenticate,
  companyLimiter,
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
      const validatedData = updateCompanySchema.parse(req.body);

      // Handle custom fields separately to merge them properly
      let updateData: any = { ...validatedData };
      if (validatedData.customFields) {
        // Get existing company to merge custom fields
        const existingCompany = await Company.findOne({ _id: id, workspaceId });
        if (existingCompany) {
          // Merge custom fields
          const mergedCustomFields = new Map(existingCompany.customFields || new Map());
          Object.entries(validatedData.customFields).forEach(([key, value]) => {
            mergedCustomFields.set(key, value);
          });
          updateData.customFields = mergedCustomFields;
        }
      }

      // Update company
      const companyDoc = await Company.findOneAndUpdate(
        { _id: id, workspaceId },
        updateData,
        { new: true, runValidators: true }
      ).populate("assignedTo", "name email");

      if (!companyDoc) {
        return res.status(404).json({
          success: false,
          error: "Company not found.",
        });
      }

      // Convert Map to plain object for JSON serialization
      const company: any = companyDoc.toObject();
      if (company.customFields && company.customFields instanceof Map) {
        company.customFields = Object.fromEntries(company.customFields);
      }

      res.status(200).json({
        success: true,
        message: "Company updated successfully!",
        data: {
          company,
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
          error: "Invalid company ID format.",
        });
      }

      console.error("Update company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update company. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/companies/:id
 * @desc    Delete company
 * @access  Private
 */
router.delete(
  "/:workspaceId/companies/:id",
  authenticate,
  companyLimiter,
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

      // Delete company
      const company = await Company.findOneAndDelete({
        _id: id,
        workspaceId,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: "Company not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Company deleted successfully!",
      });
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid company ID format.",
        });
      }

      console.error("Delete company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete company. Please try again.",
        });
    }
  }
);

export default router;
