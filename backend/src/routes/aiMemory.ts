import express from 'express';
import { Types } from 'mongoose';
import AIClientMemory from '../models/AIClientMemory';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiMemoryService } from '../services/AIMemoryService';

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/contacts/:contactId/ai-memory
 * Get what the AI has learned about this contact
 */
router.get('/workspaces/:workspaceId/contacts/:contactId/ai-memory', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, contactId } = req.params;

        const memory = await AIClientMemory.findOne({
            workspaceId: new Types.ObjectId(workspaceId),
            contactId: new Types.ObjectId(contactId),
        }).lean();

        if (!memory) {
            return res.json({
                success: true,
                data: {
                    exists: false,
                    message: 'No AI memory exists for this contact yet. The AI will start learning after interactions.',
                },
            });
        }

        res.json({
            success: true,
            data: {
                exists: true,
                facts: memory.facts,
                preferences: memory.preferences,
                interactions: memory.interactions.slice(-10), // Last 10
                insights: memory.insights,
                stats: {
                    totalInteractions: memory.totalInteractions,
                    positiveOutcomeRate: Math.round(memory.positiveOutcomeRate * 100),
                    lastInteractionAt: memory.lastInteractionAt,
                    factsCount: memory.facts.length,
                    createdAt: memory.createdAt,
                },
            },
        });
    } catch (error: any) {
        console.error('Error fetching AI memory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/workspaces/:workspaceId/contacts/:contactId/ai-memory
 * Delete AI memory for a contact (privacy/GDPR compliance)
 */
router.delete('/workspaces/:workspaceId/contacts/:contactId/ai-memory', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, contactId } = req.params;

        await aiMemoryService.deleteMemory(workspaceId, contactId);

        res.json({
            success: true,
            message: 'AI memory for this contact has been deleted.',
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/workspaces/:workspaceId/contacts/:contactId/ai-memory/facts/:factKey
 * Delete a specific learned fact
 */
router.delete('/workspaces/:workspaceId/contacts/:contactId/ai-memory/facts/:factKey', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, contactId, factKey } = req.params;

        await AIClientMemory.updateOne(
            {
                workspaceId: new Types.ObjectId(workspaceId),
                contactId: new Types.ObjectId(contactId),
            },
            {
                $pull: { facts: { key: factKey } },
            }
        );

        res.json({
            success: true,
            message: `Fact "${factKey}" has been deleted.`,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/workspaces/:workspaceId/contacts/:contactId/ai-memory/facts/:factKey
 * Correct a learned fact
 */
router.patch('/workspaces/:workspaceId/contacts/:contactId/ai-memory/facts/:factKey', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, contactId, factKey } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({ success: false, error: 'Value is required' });
        }

        await AIClientMemory.updateOne(
            {
                workspaceId: new Types.ObjectId(workspaceId),
                contactId: new Types.ObjectId(contactId),
                'facts.key': factKey,
            },
            {
                $set: {
                    'facts.$.value': value,
                    'facts.$.confidence': 100, // User-corrected = high confidence
                    'facts.$.source': 'user_correction',
                    'facts.$.extractedAt': new Date(),
                },
            }
        );

        res.json({
            success: true,
            message: `Fact "${factKey}" has been updated.`,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/workspaces/:workspaceId/contacts/:contactId/ai-memory/facts
 * Manually add a fact
 */
router.post('/workspaces/:workspaceId/contacts/:contactId/ai-memory/facts', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, contactId } = req.params;
        const { key, value } = req.body;

        if (!key || !value) {
            return res.status(400).json({ success: false, error: 'Key and value are required' });
        }

        await AIClientMemory.updateOne(
            {
                workspaceId: new Types.ObjectId(workspaceId),
                contactId: new Types.ObjectId(contactId),
            },
            {
                $push: {
                    facts: {
                        key,
                        value,
                        confidence: 100,
                        source: 'user_added',
                        extractedAt: new Date(),
                        confirmedCount: 1,
                    },
                },
                $setOnInsert: {
                    preferences: [],
                    interactions: [],
                    insights: [],
                    totalInteractions: 0,
                    positiveOutcomeRate: 0,
                },
            },
            { upsert: true }
        );

        res.json({
            success: true,
            message: `Fact "${key}" has been added.`,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/workspaces/:workspaceId/contacts/:contactId/ai-memory/feedback
 * Record feedback on AI interaction quality
 */
router.post('/workspaces/:workspaceId/contacts/:contactId/ai-memory/feedback', authenticate, async (req: AuthRequest, res) => {
    try {
        const { workspaceId, contactId } = req.params;
        const { helpful } = req.body;

        await aiMemoryService.recordFeedback(contactId, workspaceId, helpful);

        res.json({
            success: true,
            message: 'Feedback recorded. The AI will learn from this.',
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
