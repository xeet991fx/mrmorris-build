/**
 * Integration Credentials API
 *
 * CRUD operations for managing integration credentials
 * (Slack, Google Sheets, Notion, Gmail, Calendar)
 *
 * Mounted at: /api/workspaces/:workspaceId/credentials
 */

import express from 'express';
import Project from '../models/Project';
import IntegrationCredential from '../models/IntegrationCredential';
import { authenticate, AuthRequest } from '../middleware/auth';
import { clearWorkspaceCache } from '../services/AgentCopilotService'; // Story 4.6 Issue #3 Fix

// TODO Story 4.6 Issue #3: Add clearWorkspaceCache() calls after integration credential create/update/delete operations
// See emailTemplate.ts and customField.ts for examples

const router = express.Router();

/**
 * List all credentials for a workspace
 * GET /api/workspaces/:workspaceId/credentials
 *
 * Query params:
 * - type: Filter by integration type (optional)
 */
router.get(
    '/:workspaceId/credentials',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId } = req.params;
            const { type } = req.query;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Build query
            const query: any = { workspaceId };
            if (type) {
                query.type = type;
            }

            // Fetch credentials (without encrypted data)
            const credentials = await IntegrationCredential.find(query)
                .select('-encryptedData')
                .sort({ createdAt: -1 })
                .exec();

            res.json({ credentials });
        } catch (error: any) {
            console.error('[CredentialsAPI] List error:', error.message);
            res.status(500).json({ error: 'Failed to fetch credentials' });
        }
    }
);

/**
 * Get a single credential
 * GET /api/workspaces/:workspaceId/credentials/:id
 */
router.get(
    '/:workspaceId/credentials/:id',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, id } = req.params;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Fetch credential
            const credential = await IntegrationCredential.findOne({
                _id: id,
                workspaceId,
            }).select('-encryptedData');

            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }

            res.json({ credential });
        } catch (error: any) {
            console.error('[CredentialsAPI] Get error:', error.message);
            res.status(500).json({ error: 'Failed to fetch credential' });
        }
    }
);

/**
 * Create a new credential
 * POST /api/workspaces/:workspaceId/credentials
 *
 * Body:
 * - type: Integration type
 * - name: User-friendly name
 * - data: Credential data (varies by type)
 */
router.post(
    '/:workspaceId/credentials',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId } = req.params;
            const { type, name, data } = req.body;

            // Validate required fields
            if (!type || !name || !data) {
                return res.status(400).json({
                    error: 'Missing required fields: type, name, data',
                });
            }

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Create credential
            const credential = new IntegrationCredential({
                workspaceId,
                type,
                name,
            });

            // Encrypt and set credential data
            credential.setCredentialData(data);

            // Save to database
            await credential.save();

            // Validate the credential
            await credential.validateCredential();

            // Return without encrypted data
            const credentialResponse = await IntegrationCredential.findById(
                credential._id
            ).select('-encryptedData');

            res.status(201).json({ credential: credentialResponse });
        } catch (error: any) {
            console.error('[CredentialsAPI] Create error:', error.message);

            // Handle duplicate name error
            if (error.code === 11000) {
                return res.status(409).json({
                    error: 'A credential with this name already exists for this integration',
                });
            }

            res.status(500).json({ error: 'Failed to create credential' });
        }
    }
);

/**
 * Update a credential
 * PUT /api/workspaces/:workspaceId/credentials/:id
 *
 * Body:
 * - name: New name (optional)
 * - data: New credential data (optional)
 */
router.put(
    '/:workspaceId/credentials/:id',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, id } = req.params;
            const { name, data } = req.body;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Fetch credential
            const credential = await IntegrationCredential.findOne({
                _id: id,
                workspaceId,
            }).select('+encryptedData');

            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }

            // Update fields
            if (name) {
                credential.name = name;
            }

            if (data) {
                credential.setCredentialData(data);
                // Re-validate if data changed
                await credential.validateCredential();
            }

            await credential.save();

            // Return without encrypted data
            const credentialResponse = await IntegrationCredential.findById(
                credential._id
            ).select('-encryptedData');

            res.json({ credential: credentialResponse });
        } catch (error: any) {
            console.error('[CredentialsAPI] Update error:', error.message);

            if (error.code === 11000) {
                return res.status(409).json({
                    error: 'A credential with this name already exists for this integration',
                });
            }

            res.status(500).json({ error: 'Failed to update credential' });
        }
    }
);

/**
 * Delete a credential
 * DELETE /api/workspaces/:workspaceId/credentials/:id
 */
router.delete(
    '/:workspaceId/credentials/:id',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, id } = req.params;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Delete credential
            const credential = await IntegrationCredential.findOneAndDelete({
                _id: id,
                workspaceId,
            });

            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }

            res.json({ message: 'Credential deleted successfully' });
        } catch (error: any) {
            console.error('[CredentialsAPI] Delete error:', error.message);
            res.status(500).json({ error: 'Failed to delete credential' });
        }
    }
);

/**
 * Validate a credential
 * POST /api/workspaces/:workspaceId/credentials/:id/validate
 */
router.post(
    '/:workspaceId/credentials/:id/validate',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, id } = req.params;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Fetch credential with encrypted data
            const credential = await IntegrationCredential.findOne({
                _id: id,
                workspaceId,
            }).select('+encryptedData');

            if (!credential) {
                return res.status(404).json({ error: 'Credential not found' });
            }

            // Validate
            const isValid = await credential.validateCredential();

            // Return result
            const credentialResponse = await IntegrationCredential.findById(
                credential._id
            ).select('-encryptedData');

            res.json({
                isValid,
                credential: credentialResponse,
            });
        } catch (error: any) {
            console.error('[CredentialsAPI] Validate error:', error.message);
            res.status(500).json({ error: 'Failed to validate credential' });
        }
    }
);

export default router;
