/**
 * Salesforce Integration Routes
 *
 * OAuth, sync management, and field mapping endpoints
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { salesforceService } from '../services/SalesforceService';
import SalesforceIntegration from '../models/SalesforceIntegration';
import SyncLog from '../models/SyncLog';
import FieldMapping from '../models/FieldMapping';

const router = express.Router();

/**
 * GET /api/workspaces/:id/salesforce/auth
 * Initiate OAuth flow
 */
router.get('/workspaces/:id/salesforce/auth', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const state = `${workspaceId}:${req.user!._id}`;

            const authUrl = salesforceService.getAuthUrl(state);

            res.json({
                success: true,
                authUrl,
            });
        } catch (error: any) {
            console.error('Error initiating Salesforce OAuth:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * GET /api/workspaces/salesforce/callback
 * OAuth callback handler
 */
router.get('/workspaces/salesforce/callback',
    async (req, res: Response) => {
        try {
            const { code, state } = req.query;

            if (!code || !state) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing code or state',
                });
            }

            const [workspaceId, userId] = (state as string).split(':');

            const integration = await salesforceService.handleOAuthCallback(
                code as string,
                workspaceId,
                userId
            );

            // Redirect to frontend with success
            res.redirect(`/projects/${workspaceId}/settings/integrations?salesforce=connected`);
        } catch (error: any) {
            console.error('Error in Salesforce OAuth callback:', error);
            res.redirect(`/settings/integrations?error=${encodeURIComponent(error.message)}`);
        }
    }
);

/**
 * GET /api/workspaces/:id/salesforce/status
 * Get integration status
 */
router.get('/workspaces/:id/salesforce/status', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;

            const integration = await SalesforceIntegration.findOne({ workspaceId });

            if (!integration) {
                return res.json({
                    success: true,
                    connected: false,
                });
            }

            res.json({
                success: true,
                connected: true,
                data: {
                    organizationName: integration.organizationName,
                    userEmail: integration.userEmail,
                    syncStatus: integration.syncStatus,
                    lastSyncAt: integration.lastSyncAt,
                    nextSyncAt: integration.nextSyncAt,
                    stats: integration.stats,
                    syncDirection: integration.syncDirection,
                    syncFrequency: integration.syncFrequency,
                },
            });
        } catch (error: any) {
            console.error('Error fetching Salesforce status:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * POST /api/workspaces/:id/salesforce/sync
 * Trigger manual sync
 */
router.post('/workspaces/:id/salesforce/sync', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;

            const integration = await SalesforceIntegration.findOne({ workspaceId });

            if (!integration) {
                return res.status(404).json({
                    success: false,
                    error: 'Salesforce integration not found',
                });
            }

            // Trigger sync (async)
            salesforceService.performSync(integration._id.toString())
                .catch((error) => {
                    console.error('Sync error:', error);
                });

            res.json({
                success: true,
                message: 'Sync started',
            });
        } catch (error: any) {
            console.error('Error triggering sync:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * PUT /api/workspaces/:id/salesforce/settings
 * Update sync settings
 */
router.put('/workspaces/:id/salesforce/settings', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const {
                syncDirection,
                syncFrequency,
                syncContacts,
                syncAccounts,
                syncOpportunities,
                conflictResolution,
            } = req.body;

            const integration = await SalesforceIntegration.findOne({ workspaceId });

            if (!integration) {
                return res.status(404).json({
                    success: false,
                    error: 'Salesforce integration not found',
                });
            }

            if (syncDirection) integration.syncDirection = syncDirection;
            if (syncFrequency) integration.syncFrequency = syncFrequency;
            if (syncContacts !== undefined) integration.syncContacts = syncContacts;
            if (syncAccounts !== undefined) integration.syncAccounts = syncAccounts;
            if (syncOpportunities !== undefined) integration.syncOpportunities = syncOpportunities;
            if (conflictResolution) integration.conflictResolution = conflictResolution;

            await integration.save();

            res.json({
                success: true,
                data: integration,
            });
        } catch (error: any) {
            console.error('Error updating settings:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/salesforce/sync-logs
 * Get sync history
 */
router.get('/workspaces/:id/salesforce/sync-logs', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);

            const logs = await SyncLog.find({ workspaceId })
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum);

            const total = await SyncLog.countDocuments({ workspaceId });

            res.json({
                success: true,
                data: logs,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            });
        } catch (error: any) {
            console.error('Error fetching sync logs:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * GET /api/workspaces/:id/salesforce/field-mappings/:objectType
 * Get field mappings for an object type
 */
router.get('/workspaces/:id/salesforce/field-mappings/:objectType', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId, objectType } = req.params;

            const mapping = await FieldMapping.findOne({
                workspaceId,
                objectType,
            });

            if (!mapping) {
                // Return default mappings
                const defaults = (FieldMapping as any).getDefaultMappings(objectType);
                return res.json({
                    success: true,
                    data: {
                        objectType,
                        mappings: defaults,
                        useDefaultMappings: true,
                    },
                });
            }

            res.json({
                success: true,
                data: mapping,
            });
        } catch (error: any) {
            console.error('Error fetching field mappings:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * PUT /api/workspaces/:id/salesforce/field-mappings/:objectType
 * Update field mappings
 */
router.put('/workspaces/:id/salesforce/field-mappings/:objectType', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId, objectType } = req.params;
            const { mappings, useDefaultMappings } = req.body;

            const mapping = await FieldMapping.findOneAndUpdate(
                { workspaceId, objectType },
                {
                    mappings,
                    useDefaultMappings,
                },
                { new: true, upsert: true }
            );

            res.json({
                success: true,
                data: mapping,
            });
        } catch (error: any) {
            console.error('Error updating field mappings:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

/**
 * POST /api/workspaces/:id/salesforce/disconnect
 * Disconnect Salesforce integration
 */
router.post('/workspaces/:id/salesforce/disconnect', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { id: workspaceId } = req.params;

            const integration = await SalesforceIntegration.findOne({ workspaceId });

            if (!integration) {
                return res.status(404).json({
                    success: false,
                    error: 'Salesforce integration not found',
                });
            }

            await salesforceService.disconnect(integration._id.toString());

            res.json({
                success: true,
                message: 'Salesforce integration disconnected',
            });
        } catch (error: any) {
            console.error('Error disconnecting Salesforce:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
);

export default router;
