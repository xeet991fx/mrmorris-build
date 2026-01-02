/**
 * Workflow Data Sources API
 *
 * Mounted at: /api/workspaces (see server.ts)
 * Full path: GET /api/workspaces/:workspaceId/workflows/:workflowId/steps/:stepId/data-sources
 * Returns available data sources for autocomplete in workflow configuration
 */

import express from 'express';
import Workflow from '../../models/Workflow';
import Project from '../../models/Project';
import {
    getAvailableDataSources,
    groupDataSourcesByCategory,
    searchDataSources
} from '../../services/workflow/dataSourceResolver';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = express.Router();

/**
 * Get available data sources for a step
 *
 * Query params:
 * - search: Optional search query to filter results
 * - grouped: If 'true', returns sources grouped by category
 */
router.get(
    '/:workspaceId/workflows/:workflowId/steps/:stepId/data-sources',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, workflowId, stepId } = req.params;
            const { search, grouped } = req.query;

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

            // Verify workflow belongs to workspace
            if (workflow.workspaceId.toString() !== workspaceId) {
                return res.status(403).json({ error: 'Workflow does not belong to this workspace' });
            }

            // Verify step exists in workflow
            const step = workflow.steps.find(s => s.id === stepId);
            if (!step) {
                return res.status(404).json({ error: 'Step not found in workflow' });
            }

            // Get entity type from trigger
            const entityType = workflow.triggerEntityType || 'contact';

            // Get all available data sources for this step
            let dataSources = getAvailableDataSources(
                workflow,
                stepId,
                entityType as 'contact' | 'deal' | 'company'
            );

            // Apply search filter if provided
            if (search && typeof search === 'string') {
                dataSources = searchDataSources(dataSources, search);
            }

            // Return grouped or flat list
            if (grouped === 'true') {
                const groupedSources = groupDataSourcesByCategory(dataSources);
                return res.json({ dataSources: groupedSources, grouped: true });
            }

            res.json({ dataSources, grouped: false });

        } catch (error: any) {
            console.error('Get data sources error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Get data sources for a specific category
 *
 * Categories: entity, step, variable, loop, system
 */
router.get(
    '/:workspaceId/workflows/:workflowId/steps/:stepId/data-sources/:category',
    authenticate,
    async (req: AuthRequest, res) => {
        try {
            const { workspaceId, workflowId, stepId, category } = req.params;

            // Validate category
            const validCategories = ['entity', 'step', 'variable', 'loop', 'system'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
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

            // Get workflow
            const workflow = await Workflow.findById(workflowId);
            if (!workflow) {
                return res.status(404).json({ error: 'Workflow not found' });
            }

            // Verify workflow belongs to workspace
            if (workflow.workspaceId.toString() !== workspaceId) {
                return res.status(403).json({ error: 'Workflow does not belong to this workspace' });
            }

            // Get entity type
            const entityType = workflow.triggerEntityType || 'contact';

            // Get all data sources and filter by category
            const allSources = getAvailableDataSources(
                workflow,
                stepId,
                entityType as 'contact' | 'deal' | 'company'
            );

            const categorySources = allSources.filter(s => s.category === category);

            res.json({ dataSources: categorySources, category });

        } catch (error: any) {
            console.error('Get category data sources error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

export default router;
