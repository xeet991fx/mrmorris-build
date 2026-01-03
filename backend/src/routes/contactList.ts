import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { smartListService } from '../services/SmartListService';
import ContactList from '../models/ContactList';

const router = express.Router();

/**
 * @route   GET /api/workspaces/:workspaceId/lists
 * @desc    Get all lists for workspace
 * @access  Private
 */
router.get(
  '/:workspaceId/lists',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      const lists = await smartListService.getLists(workspaceId);

      res.json({
        success: true,
        data: lists,
      });
    } catch (error: any) {
      console.error('Get lists error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch lists',
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/lists/:id
 * @desc    Get single list with contacts
 * @access  Private
 */
router.get(
  '/:workspaceId/lists/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;

      const result = await smartListService.getListWithContacts(id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch list',
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/lists
 * @desc    Create new list
 * @access  Private
 */
router.post(
  '/:workspaceId/lists',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { name, description, type, contacts, filters, color, icon } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Name and type are required',
        });
      }

      const list = await smartListService.createList(
        workspaceId,
        (req.user?._id as any).toString(),
        {
          name,
          description,
          type,
          contacts,
          filters,
          color,
          icon,
        }
      );

      res.status(201).json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('Create list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create list',
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/lists/:id
 * @desc    Update list
 * @access  Private
 */
router.patch(
  '/:workspaceId/lists/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const list = await smartListService.updateList(id, updates);

      res.json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('Update list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update list',
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/lists/:id
 * @desc    Delete list
 * @access  Private
 */
router.delete(
  '/:workspaceId/lists/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      await smartListService.deleteList(id);

      res.json({
        success: true,
        message: 'List deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete list',
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/lists/:id/contacts
 * @desc    Add contacts to static list
 * @access  Private
 */
router.post(
  '/:workspaceId/lists/:id/contacts',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { contactIds } = req.body;

      if (!contactIds || !Array.isArray(contactIds)) {
        return res.status(400).json({
          success: false,
          error: 'contactIds array is required',
        });
      }

      const list = await smartListService.addContactsToList(id, contactIds);

      res.json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('Add contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add contacts',
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/lists/:id/contacts
 * @desc    Remove contacts from static list
 * @access  Private
 */
router.delete(
  '/:workspaceId/lists/:id/contacts',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { contactIds } = req.body;

      if (!contactIds || !Array.isArray(contactIds)) {
        return res.status(400).json({
          success: false,
          error: 'contactIds array is required',
        });
      }

      const list = await smartListService.removeContactsFromList(id, contactIds);

      res.json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('Remove contacts error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove contacts',
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/lists/:id/refresh
 * @desc    Refresh cached count for dynamic list
 * @access  Private
 */
router.post(
  '/:workspaceId/lists/:id/refresh',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const list = await smartListService.refreshListCount(id);

      res.json({
        success: true,
        data: list,
      });
    } catch (error: any) {
      console.error('Refresh list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh list',
      });
    }
  }
);

export default router;
