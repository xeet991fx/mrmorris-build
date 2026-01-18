import express, { Response } from "express";
import mongoose from "mongoose";
import { authenticate, AuthRequest } from "../middleware/auth";
import Sequence from "../models/Sequence";
import Contact from "../models/Contact";
import Project from "../models/Project";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * Sequence Routes
 * 
 * CRUD operations for email sequences.
 * Routes: /api/workspaces/:workspaceId/sequences
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

async function validateWorkspaceAccess(
    workspaceId: string,
    userId: string,
    res: Response
): Promise<boolean> {
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
        res.status(404).json({
            success: false,
            error: "Workspace not found.",
        });
        return false;
    }

    if (workspace.userId.toString() !== userId) {
        res.status(403).json({
            success: false,
            error: "You do not have permission to access this workspace.",
        });
        return false;
    }

    return true;
}

// ============================================
// SEQUENCE CRUD
// ============================================

/**
 * GET /api/workspaces/:workspaceId/sequences
 * Get all sequences for workspace
 */
router.get("/:workspaceId/sequences", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { status } = req.query;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const query: any = { workspaceId };
        if (status) {
            query.status = status;
        }

        const sequences = await Sequence.find(query)
            .sort({ createdAt: -1 })
            .select("-enrollments");

        res.json({
            success: true,
            data: { sequences },
        });
    } catch (error: any) {
        logger.error("Get sequences error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch sequences",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/sequences/:id
 * Get single sequence with enrollments
 */
router.get("/:workspaceId/sequences/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const sequence = await Sequence.findOne({ _id: id, workspaceId })
            .populate("enrollments.contactId", "firstName lastName email");

        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        res.json({
            success: true,
            data: { sequence },
        });
    } catch (error: any) {
        logger.error("Get sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch sequence",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/sequences
 * Create new sequence
 */
router.post("/:workspaceId/sequences", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { name, description, steps, settings } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Sequence name is required",
            });
        }

        // Process steps - add IDs and order
        const processedSteps = (steps || []).map((step: any, index: number) => ({
            ...step,
            id: step.id || new mongoose.Types.ObjectId().toString(),
            order: index,
        }));

        const sequence = await Sequence.create({
            workspaceId,
            userId: req.user?._id,
            name,
            description,
            steps: processedSteps,
            ...settings,
        });

        res.status(201).json({
            success: true,
            data: { sequence },
            message: "Sequence created successfully",
        });
    } catch (error: any) {
        logger.error("Create sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create sequence",
        });
    }
});

/**
 * PUT /api/workspaces/:workspaceId/sequences/:id
 * Update sequence
 */
router.put("/:workspaceId/sequences/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const updates = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        // Process steps if provided
        if (updates.steps) {
            updates.steps = updates.steps.map((step: any, index: number) => ({
                ...step,
                id: step.id || new mongoose.Types.ObjectId().toString(),
                order: index,
            }));
        }

        const sequence = await Sequence.findOneAndUpdate(
            { _id: id, workspaceId },
            updates,
            { new: true }
        );

        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        res.json({
            success: true,
            data: { sequence },
            message: "Sequence updated successfully",
        });
    } catch (error: any) {
        logger.error("Update sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to update sequence",
        });
    }
});

/**
 * DELETE /api/workspaces/:workspaceId/sequences/:id
 * Delete sequence
 */
router.delete("/:workspaceId/sequences/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const sequence = await Sequence.findOneAndDelete({ _id: id, workspaceId });

        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        res.json({
            success: true,
            message: "Sequence deleted successfully",
        });
    } catch (error: any) {
        logger.error("Delete sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete sequence",
        });
    }
});

// ============================================
// STATUS MANAGEMENT
// ============================================

/**
 * POST /api/workspaces/:workspaceId/sequences/:id/activate
 * Activate a sequence
 */
router.post("/:workspaceId/sequences/:id/activate", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const sequence = await Sequence.findOne({ _id: id, workspaceId });

        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        if (sequence.steps.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Sequence must have at least one step to be activated",
            });
        }

        sequence.status = "active";
        await sequence.save();

        res.json({
            success: true,
            data: { sequence },
            message: "Sequence activated",
        });
    } catch (error: any) {
        logger.error("Activate sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to activate sequence",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/sequences/:id/pause
 * Pause a sequence
 */
router.post("/:workspaceId/sequences/:id/pause", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const sequence = await Sequence.findOneAndUpdate(
            { _id: id, workspaceId },
            { status: "paused" },
            { new: true }
        );

        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        res.json({
            success: true,
            data: { sequence },
            message: "Sequence paused",
        });
    } catch (error: any) {
        logger.error("Pause sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to pause sequence",
        });
    }
});

// ============================================
// ENROLLMENT MANAGEMENT
// ============================================

/**
 * POST /api/workspaces/:workspaceId/sequences/:id/enroll
 * Enroll a contact in source sequence
 */
router.post("/:workspaceId/sequences/:id/enroll", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { contactId } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        if (!contactId) {
            return res.status(400).json({
                success: false,
                error: "Contact ID is required",
            });
        }

        // Get sequence
        const sequence = await Sequence.findOne({ _id: id, workspaceId });
        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        if (sequence.status !== "active") {
            return res.status(400).json({
                success: false,
                error: "Can only enroll in active sequences",
            });
        }

        // Verify contact exists
        const contact = await Contact.findOne({ _id: contactId, workspaceId });
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: "Contact not found",
            });
        }

        // Check if already enrolled
        const alreadyEnrolled = sequence.enrollments.some(
            (e) => e.contactId.toString() === contactId && e.status === "active"
        );
        if (alreadyEnrolled) {
            return res.status(400).json({
                success: false,
                error: "Contact is already enrolled in this sequence",
            });
        }

        // Calculate first email time
        const firstStep = sequence.steps.find((s) => s.order === 0);
        const delayMs = firstStep ?
            getDelayMs(firstStep.delay.value, firstStep.delay.unit) : 0;
        const nextEmailAt = new Date(Date.now() + delayMs);

        // Add enrollment
        sequence.enrollments.push({
            contactId,
            currentStepIndex: 0,
            status: "active",
            enrolledAt: new Date(),
            nextEmailAt,
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
        });

        // Update stats
        sequence.stats.totalEnrolled++;
        sequence.stats.currentlyActive++;

        await sequence.save();

        res.json({
            success: true,
            message: "Contact enrolled in sequence",
            data: { nextEmailAt },
        });
    } catch (error: any) {
        logger.error("Enroll in sequence error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to enroll contact",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/sequences/:id/unenroll
 * Unenroll a contact from a sequence
 */
router.post("/:workspaceId/sequences/:id/unenroll", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { contactId } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const sequence = await Sequence.findOne({ _id: id, workspaceId });
        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        const enrollment = sequence.enrollments.find(
            (e) => e.contactId.toString() === contactId && e.status === "active"
        );

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                error: "Enrollment not found",
            });
        }

        enrollment.status = "unenrolled";
        sequence.stats.currentlyActive--;
        sequence.stats.unenrolled++;

        await sequence.save();

        res.json({
            success: true,
            message: "Contact unenrolled from sequence",
        });
    } catch (error: any) {
        logger.error("Unenroll error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to unenroll contact",
        });
    }
});

// ============================================
// BULK ENROLLMENT
// ============================================

/**
 * POST /api/workspaces/:workspaceId/sequences/:id/enroll-bulk
 * Enroll multiple contacts in a sequence
 */
router.post("/:workspaceId/sequences/:id/enroll-bulk", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { contactIds } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "contactIds array is required",
            });
        }

        // Get sequence
        const sequence = await Sequence.findOne({ _id: id, workspaceId });
        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        if (sequence.status !== "active") {
            return res.status(400).json({
                success: false,
                error: "Can only enroll in active sequences",
            });
        }

        // Verify contacts exist
        const contacts = await Contact.find({
            _id: { $in: contactIds },
            workspaceId,
        });

        const validContactIds = new Set(contacts.map((c) => c._id.toString()));

        // Get already enrolled contact IDs
        const alreadyEnrolled = new Set(
            sequence.enrollments
                .filter((e) => e.status === "active")
                .map((e) => e.contactId.toString())
        );

        // Calculate first email time
        const firstStep = sequence.steps.find((s) => s.order === 0);
        const delayMs = firstStep ? getDelayMs(firstStep.delay.value, firstStep.delay.unit) : 0;

        let enrolled = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const contactId of contactIds) {
            if (!validContactIds.has(contactId)) {
                errors.push(`Contact ${contactId} not found`);
                skipped++;
                continue;
            }

            if (alreadyEnrolled.has(contactId)) {
                skipped++;
                continue;
            }

            const nextEmailAt = new Date(Date.now() + delayMs);

            sequence.enrollments.push({
                contactId: new mongoose.Types.ObjectId(contactId),
                currentStepIndex: 0,
                status: "active",
                enrolledAt: new Date(),
                nextEmailAt,
                emailsSent: 0,
                emailsOpened: 0,
                emailsClicked: 0,
            });

            sequence.stats.totalEnrolled++;
            sequence.stats.currentlyActive++;
            enrolled++;
        }

        await sequence.save();

        res.json({
            success: true,
            message: `Enrolled ${enrolled} contacts, skipped ${skipped}`,
            data: {
                enrolled,
                skipped,
                errors: errors.length > 0 ? errors : undefined,
            },
        });
    } catch (error: any) {
        logger.error("Bulk enroll error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to bulk enroll contacts",
        });
    }
});

// ============================================
// SEQUENCE PROCESSING (MANUAL TRIGGER)
// ============================================

/**
 * POST /api/workspaces/:workspaceId/sequences/process
 * Manually trigger sequence email processing (for testing)
 */
router.post("/:workspaceId/sequences/process", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        // Import the trigger function
        const { triggerSequenceProcessing } = await import("../jobs/sequenceEmailJob");
        const result = await triggerSequenceProcessing();

        res.json({
            success: true,
            message: `Processed sequences: ${result.queued} queued, ${result.skipped} skipped`,
            data: result,
        });
    } catch (error: any) {
        logger.error("Sequence processing error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to process sequences",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/sequences/:id/enrollments
 * Get all enrollments for a sequence with contact details
 */
router.get("/:workspaceId/sequences/:id/enrollments", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { status } = req.query;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const sequence = await Sequence.findOne({ _id: id, workspaceId })
            .populate("enrollments.contactId", "firstName lastName email company");

        if (!sequence) {
            return res.status(404).json({
                success: false,
                error: "Sequence not found",
            });
        }

        let enrollments = sequence.enrollments;

        // Filter by status if provided
        if (status && typeof status === "string") {
            enrollments = enrollments.filter((e) => e.status === status);
        }

        res.json({
            success: true,
            data: {
                enrollments,
                stats: sequence.stats,
            },
        });
    } catch (error: any) {
        logger.error("Get enrollments error", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch enrollments",
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDelayMs(value: number, unit: string): number {
    switch (unit) {
        case "hours":
            return value * 60 * 60 * 1000;
        case "days":
            return value * 24 * 60 * 60 * 1000;
        case "weeks":
            return value * 7 * 24 * 60 * 60 * 1000;
        default:
            return value * 24 * 60 * 60 * 1000;
    }
}

export default router;
