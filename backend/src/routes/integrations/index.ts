/**
 * Integrations Routes
 * Story 5.1 - OAuth Authentication Flow
 *
 * Generic routes for managing all integrations (Gmail, LinkedIn, Slack, Calendar, etc.)
 */

import express from 'express';
import mongoose from 'mongoose';
import IntegrationCredential from '../../models/IntegrationCredential';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * GET /api/integrations
 *
 * Get all integrations for a workspace
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Find all integrations for this workspace
        const integrations = await IntegrationCredential.find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
        })
            .select('-encryptedData') // Never expose encrypted credentials
            .lean();

        res.json({
            success: true,
            integrations,
        });
    } catch (error: any) {
        logger.error('[Integrations] Get integrations error:', error.message);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * DELETE /api/integrations/:credentialId
 *
 * Disconnect an integration
 */
router.delete('/:credentialId', authenticate, async (req: AuthRequest, res) => {
    try {
        const { credentialId } = req.params;
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Find and delete the credential (with workspace isolation)
        const result = await IntegrationCredential.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(credentialId),
            workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
        });

        if (!result) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        logger.info(`[Integrations] Disconnected ${result.type} for workspace ${workspaceId}`);

        res.json({
            success: true,
            message: 'Integration disconnected successfully',
        });
    } catch (error: any) {
        logger.error('[Integrations] Disconnect error:', error.message);
        res.status(500).json({ error: 'Failed to disconnect integration' });
    }
});

export default router;
