/**
 * Contact Deduplication Routes
 *
 * Handles finding and merging duplicate contacts
 */

import express, { Response } from 'express';
import { Types } from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import Contact from '../models/Contact';
import Project from '../models/Project';

const router = express.Router();

/**
 * POST /:workspaceId/contacts/find-duplicates
 * Find duplicate contacts in a workspace
 */
router.post('/:workspaceId/contacts/find-duplicates', authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Verify workspace access
      const workspace = await Project.findById(workspaceId);
      if (!workspace || workspace.userId.toString() !== (req.user!._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Find duplicates by email
      const emailDuplicates = await Contact.aggregate([
        {
          $match: {
            workspaceId: new Types.ObjectId(workspaceId),
            email: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$email',
            count: { $sum: 1 },
            contacts: {
              $push: {
                id: '$_id',
                firstName: '$firstName',
                lastName: '$lastName',
                email: '$email',
                company: '$company',
                phone: '$phone',
                source: '$source',
                status: '$status',
                createdAt: '$createdAt',
                updatedAt: '$updatedAt',
              },
            },
          },
        },
        {
          $match: { count: { $gt: 1 } },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Find potential duplicates by name + company (fuzzy matching)
      const nameDuplicates = await Contact.aggregate([
        {
          $match: {
            workspaceId: new Types.ObjectId(workspaceId),
            firstName: { $exists: true, $ne: '' },
            company: { $exists: true, $ne: '' },
          },
        },
        {
          $group: {
            _id: {
              firstName: { $toLower: '$firstName' },
              lastName: { $toLower: '$lastName' },
              company: { $toLower: '$company' },
            },
            count: { $sum: 1 },
            contacts: {
              $push: {
                id: '$_id',
                firstName: '$firstName',
                lastName: '$lastName',
                email: '$email',
                company: '$company',
                phone: '$phone',
                source: '$source',
                status: '$status',
                createdAt: '$createdAt',
                updatedAt: '$updatedAt',
              },
            },
          },
        },
        {
          $match: { count: { $gt: 1 } },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      res.json({
        success: true,
        data: {
          byEmail: emailDuplicates,
          byNameCompany: nameDuplicates,
          totalDuplicateGroups: emailDuplicates.length + nameDuplicates.length,
        },
      });
    } catch (error: any) {
      console.error('Find duplicates error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to find duplicates',
      });
    }
  }
);

/**
 * POST /:workspaceId/contacts/:id/merge
 * Merge a duplicate contact into the primary contact
 */
router.post('/:workspaceId/contacts/:id/merge', authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id: primaryId } = req.params;
      const { duplicateId, fieldSelections } = req.body;

      if (!duplicateId) {
        return res.status(400).json({
          success: false,
          error: 'duplicateId is required',
        });
      }

      // Verify workspace access
      const workspace = await Project.findById(workspaceId);
      if (!workspace || workspace.userId.toString() !== (req.user!._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Get both contacts
      const primaryContact = await Contact.findById(primaryId);
      const duplicateContact = await Contact.findById(duplicateId);

      if (!primaryContact || !duplicateContact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found',
        });
      }

      // Verify both contacts belong to the same workspace
      if (
        primaryContact.workspaceId.toString() !== workspaceId ||
        duplicateContact.workspaceId.toString() !== workspaceId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Contacts must belong to the same workspace',
        });
      }

      // Prepare merged data based on field selections
      const mergedData: any = {};

      // If fieldSelections provided, use them
      if (fieldSelections && typeof fieldSelections === 'object') {
        for (const [field, source] of Object.entries(fieldSelections)) {
          if (source === 'duplicate' && duplicateContact.get(field)) {
            mergedData[field] = duplicateContact.get(field);
          }
          // If source is 'primary', we don't need to do anything (keep primary value)
        }
      } else {
        // Default: merge strategy - take non-empty values from duplicate
        const fieldsToMerge = [
          'lastName',
          'email',
          'phone',
          'company',
          'jobTitle',
          'linkedin',
          'twitter',
          'website',
          'address',
          'notes',
        ];

        for (const field of fieldsToMerge) {
          const duplicateValue = duplicateContact.get(field);
          const primaryValue = primaryContact.get(field);

          // If primary is empty and duplicate has value, use duplicate
          if (!primaryValue && duplicateValue) {
            mergedData[field] = duplicateValue;
          }
        }

        // Merge tags (combine unique values)
        if (duplicateContact.tags && duplicateContact.tags.length > 0) {
          const combinedTags = [
            ...(primaryContact.tags || []),
            ...duplicateContact.tags,
          ];
          mergedData.tags = [...new Set(combinedTags)];
        }
      }

      // Update primary contact
      await Contact.findByIdAndUpdate(
        primaryId,
        {
          $set: mergedData,
          $push: {
            mergeHistory: {
              mergedContactId: duplicateContact._id,
              mergedAt: new Date(),
              mergedBy: req.user!._id,
              mergedData: duplicateContact.toObject(),
            },
          },
        },
        { new: true }
      );

      // Delete the duplicate contact
      await Contact.findByIdAndDelete(duplicateId);

      console.log(`✅ Merged contact ${duplicateId} into ${primaryId}`);

      res.json({
        success: true,
        message: 'Contacts merged successfully',
        data: {
          primaryId,
          deletedId: duplicateId,
          mergedFields: Object.keys(mergedData),
        },
      });
    } catch (error: any) {
      console.error('Merge contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to merge contacts',
      });
    }
  }
);

/**
 * GET /:workspaceId/contacts/:id/merge-history
 * Get merge history for a contact
 */
router.get('/:workspaceId/contacts/:id/merge-history', authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Verify workspace access
      const workspace = await Project.findById(workspaceId);
      if (!workspace || workspace.userId.toString() !== (req.user!._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const contact = await Contact.findById(id)
        .select('mergeHistory')
        .populate('mergeHistory.mergedBy', 'name email');

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found',
        });
      }

      res.json({
        success: true,
        data: {
          mergeHistory: contact.mergeHistory || [],
        },
      });
    } catch (error: any) {
      console.error('Get merge history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get merge history',
      });
    }
  }
);

export default router;
