import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import Company from "../models/Company";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createCompanySchema,
  updateCompanySchema,
  companyQuerySchema,
} from "../validations/company";
import { fileParserService } from "../services/FileParserService";
import { aiDataExtractor } from "../services/AIDataExtractor";

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

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/pdf",
    ];
    const allowedExtensions = ["csv", "xlsx", "xls", "pdf"];
    const ext = file.originalname.split(".").pop()?.toLowerCase();

    if (allowedTypes.includes(file.mimetype) || (ext && allowedExtensions.includes(ext))) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload CSV, Excel, or PDF files."));
    }
  },
});

/**
 * @route   POST /api/workspaces/:workspaceId/companies/preview
 * @desc    Preview/analyze file for import - returns column mappings and sample data
 * @access  Private
 */
router.post(
  "/:workspaceId/companies/preview",
  authenticate,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded.",
        });
      }

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

      console.log(`📤 Previewing file: ${file.originalname} (${file.mimetype})`);

      // Parse the file
      const parseResult = await fileParserService.parseFile(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      console.log(`📊 Parsed ${parseResult.rowCount} rows from file`);

      // Get AI column mappings
      const extractionResult = await aiDataExtractor.extractCompanies(parseResult);

      // Get sample data (first 3 rows)
      const sampleData = parseResult.rows.slice(0, 3);

      // Available target fields for companies
      const availableFields = [
        { key: "name", label: "Company Name", required: true },
        { key: "industry", label: "Industry", required: false },
        { key: "website", label: "Website", required: false },
        { key: "phone", label: "Phone", required: false },
        { key: "companySize", label: "Company Size", required: false },
        { key: "annualRevenue", label: "Annual Revenue", required: false },
        { key: "employeeCount", label: "Employee Count", required: false },
        { key: "status", label: "Status", required: false },
        { key: "source", label: "Lead Source", required: false },
        { key: "tags", label: "Tags (comma-separated)", required: false },
        { key: "linkedinUrl", label: "LinkedIn URL", required: false },
        { key: "twitterUrl", label: "Twitter URL", required: false },
        { key: "facebookUrl", label: "Facebook URL", required: false },
        { key: "notes", label: "Notes", required: false },
        { key: "address.street", label: "Street Address", required: false },
        { key: "address.city", label: "City", required: false },
        { key: "address.state", label: "State", required: false },
        { key: "address.country", label: "Country", required: false },
        { key: "address.zipCode", label: "ZIP Code", required: false },
        { key: "_skip", label: "Do not import", required: false },
      ];

      res.status(200).json({
        success: true,
        data: {
          filename: file.originalname,
          totalRows: parseResult.rowCount,
          headers: parseResult.headers,
          sampleData,
          columnMappings: extractionResult.columnMappings,
          availableFields,
          warnings: extractionResult.warnings,
        },
      });
    } catch (error: any) {
      console.error("Preview companies error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze file. Please try again.",
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/companies/import
 * @desc    Import companies from CSV, Excel, or PDF file
 * @access  Private
 */
router.post(
  "/:workspaceId/companies/import",
  authenticate,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded.",
        });
      }

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

      console.log(`📤 Processing file upload: ${file.originalname} (${file.mimetype})`);

      // Parse the file
      const parseResult = await fileParserService.parseFile(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      console.log(`📊 Parsed ${parseResult.rowCount} rows from file`);

      // Extract companies using AI
      const extractionResult = await aiDataExtractor.extractCompanies(parseResult);

      console.log(`🤖 AI extracted ${extractionResult.validRows} valid companies`);

      // Import companies with duplicate detection
      const results = {
        imported: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      };

      const skipDuplicates = req.body.skipDuplicates !== "false";

      for (const companyData of extractionResult.data) {
        try {
          // Skip if no company name
          if (!companyData.name) {
            results.skipped.push({
              data: companyData,
              reason: "Missing company name",
            });
            continue;
          }

          // Check for duplicates by name
          const existing = await Company.findOne({
            workspaceId,
            name: { $regex: new RegExp(`^${companyData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
          });

          if (existing) {
            if (skipDuplicates) {
              results.skipped.push({
                name: companyData.name,
                reason: "Company name already exists",
              });
              continue;
            } else {
              results.errors.push({
                name: companyData.name,
                error: "Company name already exists",
              });
              continue;
            }
          }

          // Create the company
          const company = await Company.create({
            workspaceId,
            userId: req.user?._id,
            name: companyData.name,
            industry: companyData.industry,
            website: companyData.website,
            phone: companyData.phone,
            companySize: companyData.companySize,
            annualRevenue: companyData.annualRevenue,
            employeeCount: companyData.employeeCount,
            status: companyData.status || "lead",
            tags: companyData.tags || [],
            source: companyData.source || "File Import",
            linkedinUrl: companyData.linkedinUrl,
            twitterUrl: companyData.twitterUrl,
            facebookUrl: companyData.facebookUrl,
            notes: companyData.notes,
            address: companyData.address,
          });

          results.imported.push({
            id: company._id,
            name: company.name,
          });
        } catch (error: any) {
          results.errors.push({
            data: companyData,
            error: error.message,
          });
        }
      }

      console.log(`✅ Import complete: ${results.imported.length} imported, ${results.skipped.length} skipped, ${results.errors.length} errors`);

      res.status(200).json({
        success: true,
        message: `Imported ${results.imported.length} companies`,
        data: {
          summary: {
            totalRows: extractionResult.totalRows,
            validRows: extractionResult.validRows,
            imported: results.imported.length,
            skipped: results.skipped.length,
            errors: results.errors.length,
          },
          columnMappings: extractionResult.columnMappings,
          warnings: extractionResult.warnings,
          results,
        },
      });
    } catch (error: any) {
      console.error("Import companies error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to import companies. Please try again.",
      });
    }
  }
);

export default router;
