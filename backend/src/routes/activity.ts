import express from 'express';
import { z } from 'zod';
import Activity from '../models/Activity';
import Opportunity from '../models/Opportunity';
import Contact from '../models/Contact';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createActivitySchema = z.object({
  type: z.enum([
    'email',
    'call',
    'meeting',
    'note',
    'stage_change',
    'file_upload',
    'task',
    'ai_suggestion',
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  duration: z.number().min(0).optional(),
  emailSubject: z.string().max(300).optional(),
  emailBody: z.string().max(10000).optional(),
  dueDate: z.string().datetime().optional(),
  completed: z.boolean().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
  isAutoLogged: z.boolean().optional(),
  aiConfidence: z.number().min(0).max(100).optional(),
});

const updateActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/workspaces/:workspaceId/opportunities/:opportunityId/activities
 * Create a new activity for an opportunity
 */
router.post(
  '/workspaces/:workspaceId/opportunities/:opportunityId/activities',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, opportunityId } = req.params;
      const userId = req.user?._id;

      // Validate request body
      const validatedData = createActivitySchema.parse(req.body);

      // Verify opportunity exists and belongs to workspace
      const opportunity = await Opportunity.findOne({
        _id: opportunityId,
        workspaceId,
      });

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: 'Opportunity not found',
        });
      }

      // Create activity
      const activity = new Activity({
        workspaceId,
        userId,
        opportunityId,
        ...validatedData,
      });

      await activity.save();

      // Update opportunity activity counts
      const updateFields: any = {
        lastActivityAt: new Date(),
        $inc: { activityCount: 1 },
      };

      if (validatedData.type === 'email') {
        updateFields.$inc.emailCount = 1;
      } else if (validatedData.type === 'call') {
        updateFields.$inc.callCount = 1;
      } else if (validatedData.type === 'meeting') {
        updateFields.$inc.meetingCount = 1;
      }

      await Opportunity.findByIdAndUpdate(opportunityId, updateFields);

      // Populate user info
      await activity.populate('userId', 'name email');

      res.status(201).json({
        success: true,
        data: { activity },
      });
    } catch (error: any) {
      console.error('Create activity error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create activity',
      });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/opportunities/:opportunityId/activities
 * Get all activities for an opportunity
 */
router.get(
  '/workspaces/:workspaceId/opportunities/:opportunityId/activities',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, opportunityId } = req.params;
      const { type, limit = '50', offset = '0' } = req.query;

      // Build query
      const query: any = {
        workspaceId,
        opportunityId,
      };

      if (type) {
        query.type = type;
      }

      // Get activities
      const activities = await Activity.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      const total = await Activity.countDocuments(query);

      res.json({
        success: true,
        data: {
          activities,
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      console.error('Get activities error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activities',
      });
    }
  }
);

/**
 * PATCH /api/workspaces/:workspaceId/activities/:activityId
 * Update an activity
 */
router.patch(
  '/workspaces/:workspaceId/activities/:activityId',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, activityId } = req.params;

      // Validate request body
      const validatedData = updateActivitySchema.parse(req.body);

      // Update activity
      const activity = await Activity.findOneAndUpdate(
        { _id: activityId, workspaceId },
        { $set: validatedData },
        { new: true, runValidators: true }
      ).populate('userId', 'name email');

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
        });
      }

      res.json({
        success: true,
        data: { activity },
      });
    } catch (error: any) {
      console.error('Update activity error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update activity',
      });
    }
  }
);

/**
 * DELETE /api/workspaces/:workspaceId/activities/:activityId
 * Delete an activity
 */
router.delete(
  '/workspaces/:workspaceId/activities/:activityId',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, activityId } = req.params;

      // Find activity first to get type and opportunityId
      const activity = await Activity.findOne({ _id: activityId, workspaceId });

      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'Activity not found',
        });
      }

      // Delete activity
      await Activity.deleteOne({ _id: activityId });

      // Update opportunity activity counts
      const updateFields: any = {
        $inc: { activityCount: -1 },
      };

      if (activity.type === 'email') {
        updateFields.$inc.emailCount = -1;
      } else if (activity.type === 'call') {
        updateFields.$inc.callCount = -1;
      } else if (activity.type === 'meeting') {
        updateFields.$inc.meetingCount = -1;
      }

      await Opportunity.findByIdAndUpdate(activity.opportunityId, updateFields);

      res.json({
        success: true,
        message: 'Activity deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete activity error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete activity',
      });
    }
  }
);

// =====================================================
// CONTACT ACTIVITIES
// =====================================================

/**
 * POST /api/workspaces/:workspaceId/contacts/:contactId/activities
 * Create a new activity for a contact
 */
router.post(
  '/workspaces/:workspaceId/contacts/:contactId/activities',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, contactId } = req.params;
      const userId = req.user?._id;

      // Validate request body
      const validatedData = createActivitySchema.parse(req.body);

      // Verify contact exists and belongs to workspace
      const contact = await Contact.findOne({
        _id: contactId,
        workspaceId,
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found',
        });
      }

      // Create activity with entity linking
      const activity = new Activity({
        workspaceId,
        userId,
        entityType: 'contact',
        entityId: contactId,
        ...validatedData,
      });

      await activity.save();

      // Update contact lastContactedAt
      await Contact.findByIdAndUpdate(contactId, {
        lastContactedAt: new Date(),
      });

      // Populate user info
      await activity.populate('userId', 'name email');

      res.status(201).json({
        success: true,
        data: { activity },
      });
    } catch (error: any) {
      console.error('Create contact activity error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create activity',
      });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/contacts/:contactId/activities
 * Get all activities for a contact
 */
router.get(
  '/workspaces/:workspaceId/contacts/:contactId/activities',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, contactId } = req.params;
      const { type, limit = '50', offset = '0' } = req.query;

      // Build query using entity linking
      const query: any = {
        workspaceId,
        entityType: 'contact',
        entityId: contactId,
      };

      if (type) {
        query.type = type;
      }

      // Get activities
      const activities = await Activity.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      const total = await Activity.countDocuments(query);

      res.json({
        success: true,
        data: {
          activities,
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      console.error('Get contact activities error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activities',
      });
    }
  }
);

// =====================================================
// COMPANY ACTIVITIES
// =====================================================

/**
 * GET /api/workspaces/:workspaceId/companies/:companyId/activities
 * Get all activities for a company (direct + from linked contacts + from deals)
 */
router.get(
  '/workspaces/:workspaceId/companies/:companyId/activities',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, companyId } = req.params;
      const { type, limit = '50', offset = '0' } = req.query;

      // Build query for company activities
      const query: any = {
        workspaceId,
        entityType: 'company',
        entityId: companyId,
      };

      if (type) {
        query.type = type;
      }

      // Get activities
      const activities = await Activity.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      const total = await Activity.countDocuments(query);

      res.json({
        success: true,
        data: {
          activities,
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      console.error('Get company activities error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activities',
      });
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/companies/:companyId/activities
 * Create a new activity for a company
 */
router.post(
  '/workspaces/:workspaceId/companies/:companyId/activities',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { workspaceId, companyId } = req.params;
      const userId = req.user?._id;

      // Validate request body
      const validatedData = createActivitySchema.parse(req.body);

      // Create activity with entity linking
      const activity = new Activity({
        workspaceId,
        userId,
        entityType: 'company',
        entityId: companyId,
        ...validatedData,
      });

      await activity.save();

      // Populate user info
      await activity.populate('userId', 'name email');

      res.status(201).json({
        success: true,
        data: { activity },
      });
    } catch (error: any) {
      console.error('Create company activity error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create activity',
      });
    }
  }
);

export default router;

