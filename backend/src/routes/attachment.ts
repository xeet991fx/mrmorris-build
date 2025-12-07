import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import Attachment from '../models/Attachment';
import Opportunity from '../models/Opportunity';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error: any) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents, images, and text files are allowed.'));
    }
  },
});

// Validation schema
const createAttachmentMetadataSchema = z.object({
  category: z.enum(['proposal', 'contract', 'presentation', 'other']).optional(),
  description: z.string().max(500).optional(),
});

/**
 * POST /api/workspaces/:workspaceId/opportunities/:opportunityId/attachments
 * Upload a file attachment for an opportunity
 */
router.post(
  '/workspaces/:workspaceId/opportunities/:opportunityId/attachments',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, opportunityId } = req.params;
      const userId = req.user?._id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Verify opportunity exists and belongs to workspace
      const opportunity = await Opportunity.findOne({
        _id: opportunityId,
        workspaceId,
      });

      if (!opportunity) {
        // Delete uploaded file
        await fs.unlink(file.path);
        return res.status(404).json({
          success: false,
          error: 'Opportunity not found',
        });
      }

      // Validate metadata
      const metadata = req.body.category || req.body.description
        ? createAttachmentMetadataSchema.parse({
            category: req.body.category,
            description: req.body.description,
          })
        : {};

      // Create attachment record
      const attachment = new Attachment({
        workspaceId,
        opportunityId,
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        fileUrl: `/uploads/attachments/${file.filename}`,
        ...metadata,
      });

      await attachment.save();

      // Populate user info
      await attachment.populate('userId', 'name email');

      res.status(201).json({
        success: true,
        data: { attachment },
      });
    } catch (error: any) {
      console.error('Upload attachment error:', error);

      // Delete uploaded file if there was an error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload attachment',
      });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/opportunities/:opportunityId/attachments
 * Get all attachments for an opportunity
 */
router.get(
  '/workspaces/:workspaceId/opportunities/:opportunityId/attachments',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, opportunityId } = req.params;
      const { category } = req.query;

      // Build query
      const query: any = {
        workspaceId,
        opportunityId,
      };

      if (category) {
        query.category = category;
      }

      // Get attachments
      const attachments = await Attachment.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: { attachments },
      });
    } catch (error: any) {
      console.error('Get attachments error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch attachments',
      });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/attachments/:attachmentId/download
 * Download an attachment
 */
router.get(
  '/workspaces/:workspaceId/attachments/:attachmentId/download',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, attachmentId } = req.params;

      // Find attachment
      const attachment = await Attachment.findOne({
        _id: attachmentId,
        workspaceId,
      });

      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: 'Attachment not found',
        });
      }

      // Get file path
      const filePath = path.join(process.cwd(), attachment.fileUrl);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'File not found on server',
        });
      }

      // Set headers for download
      res.setHeader('Content-Type', attachment.fileType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${attachment.fileName}"`
      );

      // Send file
      res.sendFile(filePath);
    } catch (error: any) {
      console.error('Download attachment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to download attachment',
      });
    }
  }
);

/**
 * DELETE /api/workspaces/:workspaceId/attachments/:attachmentId
 * Delete an attachment
 */
router.delete(
  '/workspaces/:workspaceId/attachments/:attachmentId',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, attachmentId } = req.params;

      // Find attachment
      const attachment = await Attachment.findOne({
        _id: attachmentId,
        workspaceId,
      });

      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: 'Attachment not found',
        });
      }

      // Delete file from disk
      const filePath = path.join(process.cwd(), attachment.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting file from disk:', error);
        // Continue even if file deletion fails
      }

      // Delete attachment record
      await Attachment.deleteOne({ _id: attachmentId });

      res.json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete attachment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete attachment',
      });
    }
  }
);

export default router;
