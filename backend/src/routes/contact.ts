import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import Contact from "../models/Contact";
import Project from "../models/Project";
import LeadScore from "../models/LeadScore";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createContactSchema,
  updateContactSchema,
  contactQuerySchema,
} from "../validations/contact";
import { workflowService } from "../services/WorkflowService";
import { fileParserService } from "../services/FileParserService";
import { aiDataExtractor } from "../services/AIDataExtractor";
import { eventPublisher } from "../events/publisher/EventPublisher";
import { CONTACT_EVENTS } from "../events/types/contact.events";

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
      const contactDoc = await Contact.create({
        ...validatedData,
        workspaceId,
        userId: req.user?._id,
      });

      // Convert Map to plain object for JSON serialization
      const contact: any = contactDoc.toObject();
      if (contact.customFields && contact.customFields instanceof Map) {
        contact.customFields = Object.fromEntries(contact.customFields);
      }

      // Auto-initialize lead score for new contact
      try {
        const leadScore = await LeadScore.getOrCreate(workspaceId, (contactDoc._id as any).toString());
        contact.leadScore = {
          currentScore: leadScore.currentScore,
          grade: leadScore.grade,
        };
        console.log(`📊 Lead score initialized for contact ${contactDoc._id}: ${leadScore.currentScore} (${leadScore.grade})`);
      } catch (leadErr) {
        console.error("Failed to initialize lead score:", leadErr);
        // Don't fail contact creation if lead score init fails
      }

      // Publish contact.created event (non-blocking)
      eventPublisher.publish(
        CONTACT_EVENTS.CREATED,
        {
          contactId: (contactDoc._id as any).toString(),
          firstName: contactDoc.firstName,
          lastName: contactDoc.lastName,
          email: contactDoc.email,
          phone: contactDoc.phone,
          company: contactDoc.company,
          jobTitle: contactDoc.jobTitle,
          status: contactDoc.status,
          source: contactDoc.source,
          tags: contactDoc.tags,
          assignedTo: contactDoc.assignedTo?.toString(),
          customFields: contactDoc.customFields ? Object.fromEntries(contactDoc.customFields) : undefined,
        },
        {
          workspaceId,
          userId: (req.user?._id as any)?.toString(),
          source: 'api',
        }
      ).catch(err => console.error('Event publish error:', err));

      // Trigger workflow enrollment (async, don't wait) - kept for backward compatibility
      workflowService.checkAndEnroll("contact:created", contactDoc, workspaceId)
        .catch((err) => console.error("Workflow enrollment error:", err));

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
      const [contactDocs, total] = await Promise.all([
        Contact.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("assignedTo", "name email"),
        Contact.countDocuments(filter),
      ]);

      // Get lead scores for all contacts
      const contactIds = contactDocs.map((doc) => doc._id);
      const leadScores = await LeadScore.find({
        workspaceId,
        contactId: { $in: contactIds },
      });

      // Create a map of contactId => leadScore
      const leadScoreMap = new Map(
        leadScores.map((score) => [score.contactId.toString(), score])
      );

      // Convert Map to plain object for JSON serialization and attach lead scores
      const contacts = contactDocs.map((doc) => {
        const obj: any = doc.toObject();
        if (obj.customFields && obj.customFields instanceof Map) {
          obj.customFields = Object.fromEntries(obj.customFields);
        }

        // Attach lead score if exists
        const leadScore = leadScoreMap.get((doc._id as any).toString());
        if (leadScore) {
          obj.leadScore = {
            currentScore: leadScore.currentScore,
            grade: leadScore.grade,
            previousScore: leadScore.previousScore,
            previousGrade: leadScore.previousGrade,
            lastActivityAt: leadScore.lastActivityAt,
          };
        }

        return obj;
      });

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
      const contactDoc = await Contact.findOne({
        _id: id,
        workspaceId,
      }).populate("assignedTo", "name email");

      if (!contactDoc) {
        return res.status(404).json({
          success: false,
          error: "Contact not found.",
        });
      }

      // Convert Map to plain object for JSON serialization
      const contact: any = contactDoc.toObject();
      if (contact.customFields && contact.customFields instanceof Map) {
        contact.customFields = Object.fromEntries(contact.customFields);
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
      const contactDoc = await Contact.findOneAndUpdate(
        { _id: id, workspaceId },
        updateData,
        { new: true, runValidators: true }
      ).populate("assignedTo", "name email");

      if (!contactDoc) {
        return res.status(404).json({
          success: false,
          error: "Contact not found.",
        });
      }

      // Convert Map to plain object for JSON serialization
      const contact: any = contactDoc.toObject();
      if (contact.customFields && contact.customFields instanceof Map) {
        contact.customFields = Object.fromEntries(contact.customFields);
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
 * @route   POST /api/workspaces/:workspaceId/contacts/preview
 * @desc    Preview/analyze file for import - returns column mappings and sample data
 * @access  Private
 */
router.post(
  "/:workspaceId/contacts/preview",
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
      const extractionResult = await aiDataExtractor.extractContacts(parseResult);

      // Get sample data (first 3 rows)
      const sampleData = parseResult.rows.slice(0, 3);

      // Available target fields for contacts
      const availableFields = [
        { key: "firstName", label: "First Name", required: true },
        { key: "lastName", label: "Last Name", required: false },
        { key: "email", label: "Email", required: false },
        { key: "phone", label: "Phone", required: false },
        { key: "company", label: "Company", required: false },
        { key: "jobTitle", label: "Job Title", required: false },
        { key: "status", label: "Status", required: false },
        { key: "source", label: "Lead Source", required: false },
        { key: "tags", label: "Tags (comma-separated)", required: false },
        { key: "linkedin", label: "LinkedIn URL", required: false },
        { key: "twitter", label: "Twitter", required: false },
        { key: "website", label: "Website", required: false },
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
      console.error("Preview contacts error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze file. Please try again.",
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/contacts/import
 * @desc    Import contacts from CSV, Excel, or PDF file
 * @access  Private
 */
router.post(
  "/:workspaceId/contacts/import",
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

      // Extract contacts using AI
      const extractionResult = await aiDataExtractor.extractContacts(parseResult);

      console.log(`🤖 AI extracted ${extractionResult.validRows} valid contacts`);

      // Import contacts with duplicate detection
      const results = {
        imported: [] as any[],
        skipped: [] as any[],
        errors: [] as any[],
      };

      const skipDuplicates = req.body.skipDuplicates !== "false";

      for (const contactData of extractionResult.data) {
        try {
          // Skip if no identifying info
          if (!contactData.firstName && !contactData.email) {
            results.skipped.push({
              data: contactData,
              reason: "Missing required fields (firstName or email)",
            });
            continue;
          }

          // Check for duplicates by email
          if (contactData.email) {
            const existing = await Contact.findOne({
              workspaceId,
              email: contactData.email,
            });

            if (existing) {
              if (skipDuplicates) {
                results.skipped.push({
                  email: contactData.email,
                  reason: "Email already exists",
                });
                continue;
              } else {
                results.errors.push({
                  email: contactData.email,
                  error: "Email already exists",
                });
                continue;
              }
            }
          }

          // Create the contact
          const contact = await Contact.create({
            workspaceId,
            userId: req.user?._id,
            firstName: contactData.firstName || "Unknown",
            lastName: contactData.lastName || "",
            email: contactData.email,
            phone: contactData.phone,
            company: contactData.company,
            jobTitle: contactData.jobTitle,
            status: contactData.status || "lead",
            tags: contactData.tags || [],
            source: contactData.source || "File Import",
            linkedin: contactData.linkedin,
            twitter: contactData.twitter,
            website: contactData.website,
            notes: contactData.notes,
            address: contactData.address,
          });

          // Initialize lead score
          try {
            await LeadScore.getOrCreate(workspaceId, (contact._id as any).toString());
          } catch (leadErr) {
            console.error("Failed to initialize lead score:", leadErr);
          }

          results.imported.push({
            id: contact._id,
            name: `${contact.firstName} ${contact.lastName}`.trim(),
            email: contact.email,
          });
        } catch (error: any) {
          results.errors.push({
            data: contactData,
            error: error.message,
          });
        }
      }

      console.log(`✅ Import complete: ${results.imported.length} imported, ${results.skipped.length} skipped, ${results.errors.length} errors`);

      res.status(200).json({
        success: true,
        message: `Imported ${results.imported.length} contacts`,
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
      console.error("Import contacts error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to import contacts. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/contacts/:id/emails
 * @desc    Get all emails for a contact
 * @access  Private
 */
router.get(
  "/:workspaceId/contacts/:id/emails",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;
      const EmailMessage = (await import("../models/EmailMessage")).default;

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

      // Fetch emails for this contact
      const emails = await EmailMessage.find({
        workspaceId,
        contactId: id,
      })
        .sort({ sentAt: -1 })
        .limit(100)
        .lean();

      // Format response
      const formattedEmails = emails.map((email: any) => ({
        _id: email._id,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        bodyText: email.bodyText,
        fromEmail: email.fromEmail,
        toEmail: email.toEmail,
        direction: "outbound", // Campaign emails are always outbound
        sentAt: email.sentAt,
        opened: email.opened,
        openedAt: email.openedAt,
        clicked: email.clicked,
        clickedAt: email.clickedAt,
        replied: email.replied,
        repliedAt: email.repliedAt,
        bounced: email.bounced,
        bouncedAt: email.bouncedAt,
        replySubject: email.replySubject,
        replyBody: email.replyBody,
        replySentiment: email.replySentiment,
        createdAt: email.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          emails: formattedEmails,
          total: formattedEmails.length,
        },
      });
    } catch (error: any) {
      console.error("Get contact emails error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch emails. Please try again.",
      });
    }
  }
);

export default router;
