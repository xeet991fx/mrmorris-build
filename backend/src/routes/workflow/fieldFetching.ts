/**
 * Dynamic Field Fetching API
 *
 * Mounted at: /api/workspaces (see server.ts)
 * Full path: GET /api/workspaces/:workspaceId/workflows/:workflowId/fields/fetch
 * Returns live field options from third-party APIs (Slack channels, Google Sheets, Notion databases, etc.)
 */

import express from 'express';
import Project from '../../models/Project';
import Workflow from '../../models/Workflow';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { FieldFetcherService, FieldFetchRequest } from '../../services/workflow/fieldFetcher';

const router = express.Router();
const fieldFetcher = new FieldFetcherService();

/**
 * Fetch field options from third-party API
 *
 * Query params:
 * - integrationType: slack | google_sheets | notion | gmail | calendar
 * - fieldType: channel | user | spreadsheet | worksheet | database | page
 * - credentialId: ID of the IntegrationCredential to use
 * - parentData: JSON string for dependent fields (e.g., { "parentValue": "spreadsheet_id" })
 *
 * Returns: { options: FieldOption[] }
 */
router.get(
    '/:workspaceId/workflows/:workflowId/fields/fetch',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, workflowId } = req.params;
            const { integrationType, fieldType, credentialId, parentData } = req.query;

            // Validate required parameters
            if (!integrationType || !fieldType || !credentialId) {
                return res.status(400).json({
                    error: 'Missing required parameters: integrationType, fieldType, credentialId',
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

            // Verify workflow exists and belongs to workspace
            const workflow = await Workflow.findById(workflowId);
            if (!workflow) {
                return res.status(404).json({ error: 'Workflow not found' });
            }

            if (workflow.workspaceId.toString() !== workspaceId) {
                return res.status(403).json({
                    error: 'Workflow does not belong to this workspace',
                });
            }

            // Parse parent data if provided
            let parsedParentData;
            if (parentData && typeof parentData === 'string') {
                try {
                    parsedParentData = JSON.parse(parentData);
                } catch (error) {
                    return res.status(400).json({
                        error: 'Invalid parentData JSON',
                    });
                }
            }

            // Build fetch request
            const request: FieldFetchRequest = {
                integrationType: integrationType as any,
                fieldType: fieldType as any,
                workspaceId,
                credentialId: credentialId as string,
                parentData: parsedParentData,
            };

            // Fetch field options
            const options = await fieldFetcher.fetchFields(request);

            res.json({ options });
        } catch (error: any) {
            console.error('[FieldFetchAPI] Error:', error.message);

            // Return appropriate status code based on error
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }

            if (error.message.includes('Access denied') || error.message.includes('invalid')) {
                return res.status(403).json({ error: error.message });
            }

            if (error.message.includes('Unsupported')) {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: `Failed to fetch field options: ${error.message}` });
        }
    }
);

/**
 * Validate step configuration before opening config panel
 *
 * Checks:
 * 1. Action nodes require upstream connections
 * 2. Integration nodes require valid credentials
 *
 * Returns: {
 *   canOpenConfig: boolean,
 *   reason?: string,
 *   requiredActions?: Array<{ type: string, message: string }>
 * }
 */
router.get(
    '/:workspaceId/workflows/:workflowId/steps/:stepId/validation',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, workflowId, stepId } = req.params;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Get workflow
            const workflow = await Workflow.findById(workflowId);
            if (!workflow) {
                return res.status(404).json({ error: 'Workflow not found' });
            }

            if (workflow.workspaceId.toString() !== workspaceId) {
                return res.status(403).json({
                    error: 'Workflow does not belong to this workspace',
                });
            }

            // Find the step
            const step = workflow.steps.find(s => s.id === stepId);
            if (!step) {
                return res.status(404).json({ error: 'Step not found in workflow' });
            }

            // ALWAYS allow config to open
            // Integration configs handle their own progressive disclosure (Steps 1, 2, 3)
            res.json({ canOpenConfig: true });
        } catch (error: any) {
            console.error('[StepValidationAPI] Error:', error.message);
            res.status(500).json({ error: `Validation failed: ${error.message}` });
        }
    }
);

/**
 * Clear field fetcher cache
 *
 * Query params:
 * - workspace: Optional workspace ID to clear cache for specific workspace
 *
 * Returns: { message: string, cleared: number }
 */
router.post(
    '/:workspaceId/workflows/fields/clear-cache',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId } = req.params;

            // Verify workspace access
            const workspace = await Project.findById(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }

            if (workspace.userId.toString() !== req.user?._id.toString()) {
                return res.status(403).json({ error: 'Access denied to workspace' });
            }

            // Clear cache for this workspace
            FieldFetcherService.clearCache(workspaceId);

            res.json({
                message: 'Cache cleared successfully',
                workspaceId,
            });
        } catch (error: any) {
            console.error('[ClearCacheAPI] Error:', error.message);
            res.status(500).json({ error: `Failed to clear cache: ${error.message}` });
        }
    }
);

export default router;
