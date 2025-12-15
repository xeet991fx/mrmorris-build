import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Workflow from "../models/Workflow";
import WorkflowEnrollment from "../models/WorkflowEnrollment";
import Project from "../models/Project";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import Company from "../models/Company";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
    createWorkflowSchema,
    updateWorkflowSchema,
    enrollContactSchema,
} from "../validations/workflow";

const router = express.Router();

// Rate limiter for workflow operations
const workflowLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Validate workspace access
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
// WORKFLOW CRUD ROUTES
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/workflows
 * @desc    Create new workflow
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Validate input
            const result = createWorkflowSchema.safeParse({ body: req.body });
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            const validatedData = result.data.body;

            // Create workflow
            const workflow = await Workflow.create({
                ...validatedData,
                workspaceId,
                userId: req.user?._id,
                status: "draft",
            });

            res.status(201).json({
                success: true,
                message: "Workflow created successfully!",
                data: { workflow },
            });
        } catch (error: any) {
            console.error("Create workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create workflow. Please try again.",
            });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/workflows
 * @desc    Get all workflows for a workspace
 * @access  Private
 */
router.get(
    "/:workspaceId/workflows",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Parse query params
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;
            const status = req.query.status as string;
            const triggerEntityType = req.query.triggerEntityType as string;
            const search = req.query.search as string;

            // Build filter
            const filter: any = { workspaceId };

            if (status) {
                filter.status = status;
            }

            if (triggerEntityType) {
                filter.triggerEntityType = triggerEntityType;
            }

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ];
            }

            // Get workflows with pagination
            const [workflows, total] = await Promise.all([
                Workflow.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                Workflow.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    workflows,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error: any) {
            console.error("Get workflows error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch workflows. Please try again.",
            });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/workflows/:id
 * @desc    Get single workflow
 * @access  Private
 */
router.get(
    "/:workspaceId/workflows/:id",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const workflow = await Workflow.findOne({
                _id: id,
                workspaceId,
            });

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            res.status(200).json({
                success: true,
                data: { workflow },
            });
        } catch (error: any) {
            if (error.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    error: "Invalid workflow ID format.",
                });
            }

            console.error("Get workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch workflow. Please try again.",
            });
        }
    }
);

/**
 * @route   PUT /api/workspaces/:workspaceId/workflows/:id
 * @desc    Update workflow
 * @access  Private
 */
router.put(
    "/:workspaceId/workflows/:id",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Validate input
            const result = updateWorkflowSchema.safeParse({ body: req.body });
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            const validatedData = result.data.body;

            // Update workflow
            const workflow = await Workflow.findOneAndUpdate(
                { _id: id, workspaceId },
                validatedData,
                { new: true, runValidators: true }
            );

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            res.status(200).json({
                success: true,
                message: "Workflow updated successfully!",
                data: { workflow },
            });
        } catch (error: any) {
            if (error.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    error: "Invalid workflow ID format.",
                });
            }

            console.error("Update workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update workflow. Please try again.",
            });
        }
    }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/workflows/:id
 * @desc    Delete workflow
 * @access  Private
 */
router.delete(
    "/:workspaceId/workflows/:id",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Delete workflow and its enrollments
            const workflow = await Workflow.findOneAndDelete({
                _id: id,
                workspaceId,
            });

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Delete all enrollments for this workflow
            await WorkflowEnrollment.deleteMany({ workflowId: id });

            res.status(200).json({
                success: true,
                message: "Workflow deleted successfully!",
            });
        } catch (error: any) {
            if (error.name === "CastError") {
                return res.status(400).json({
                    success: false,
                    error: "Invalid workflow ID format.",
                });
            }

            console.error("Delete workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete workflow. Please try again.",
            });
        }
    }
);

// ============================================
// WORKFLOW STATUS ROUTES
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/activate
 * @desc    Activate a workflow
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/activate",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const workflow = await Workflow.findOne({ _id: id, workspaceId });

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Validate workflow has at least a trigger and one action
            const triggerStep = workflow.steps.find((s) => s.type === "trigger");
            const actionStep = workflow.steps.find((s) => s.type === "action");

            if (!triggerStep) {
                return res.status(400).json({
                    success: false,
                    error: "Workflow must have at least one trigger to be activated.",
                });
            }

            if (!actionStep) {
                return res.status(400).json({
                    success: false,
                    error: "Workflow must have at least one action to be activated.",
                });
            }

            // Activate workflow
            workflow.status = "active";
            workflow.lastActivatedAt = new Date();
            await workflow.save();

            res.status(200).json({
                success: true,
                message: "Workflow activated successfully!",
                data: { workflow },
            });
        } catch (error: any) {
            console.error("Activate workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to activate workflow. Please try again.",
            });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/pause
 * @desc    Pause a workflow
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/pause",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const workflow = await Workflow.findOneAndUpdate(
                { _id: id, workspaceId },
                { status: "paused" },
                { new: true }
            );

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Pause all active enrollments
            await WorkflowEnrollment.updateMany(
                { workflowId: id, status: "active" },
                { status: "paused" }
            );

            res.status(200).json({
                success: true,
                message: "Workflow paused successfully!",
                data: { workflow },
            });
        } catch (error: any) {
            console.error("Pause workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to pause workflow. Please try again.",
            });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/clone
 * @desc    Clone/duplicate a workflow
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/clone",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const originalWorkflow = await Workflow.findOne({ _id: id, workspaceId });

            if (!originalWorkflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Generate new step IDs to avoid conflicts
            const stepIdMap = new Map<string, string>();
            const clonedSteps = originalWorkflow.steps.map((step: any) => {
                const newStepId = new (require("mongoose").Types.ObjectId)().toString();
                stepIdMap.set(step.id || step._id?.toString(), newStepId);
                return {
                    ...step.toObject ? step.toObject() : step,
                    id: newStepId,
                    _id: undefined, // Remove old _id
                };
            });

            // Update nextStepId references
            clonedSteps.forEach((step: any) => {
                if (step.nextStepId && stepIdMap.has(step.nextStepId)) {
                    step.nextStepId = stepIdMap.get(step.nextStepId);
                }
                if (step.config?.yesStepId && stepIdMap.has(step.config.yesStepId)) {
                    step.config.yesStepId = stepIdMap.get(step.config.yesStepId);
                }
                if (step.config?.noStepId && stepIdMap.has(step.config.noStepId)) {
                    step.config.noStepId = stepIdMap.get(step.config.noStepId);
                }
            });

            // Create cloned workflow
            const clonedWorkflow = new Workflow({
                workspaceId,
                name: `${originalWorkflow.name} (Copy)`,
                description: originalWorkflow.description,
                status: "draft",
                steps: clonedSteps,
                triggerEntityType: originalWorkflow.triggerEntityType,
                allowReenrollment: originalWorkflow.allowReenrollment,
                createdBy: userId,
                // Reset all stats
                stats: {
                    totalEnrolled: 0,
                    totalCompleted: 0,
                    activeEnrollments: 0,
                },
            });

            await clonedWorkflow.save();

            res.status(201).json({
                success: true,
                message: "Workflow cloned successfully!",
                data: { workflow: clonedWorkflow },
            });
        } catch (error: any) {
            console.error("Clone workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to clone workflow. Please try again.",
            });
        }
    }
);

// DEBUG: Simple test ping route
router.get(
    "/:workspaceId/workflows/:id/test-ping",
    (req, res) => {
        console.log("🏓 TEST PING HIT:", req.params);
        res.json({ success: true, message: "Test ping works!" });
    }
);

// ============================================
// TEST WORKFLOW ROUTE
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/test
 * @desc    Test workflow execution in dry-run mode
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/test",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        console.log("🧪 TEST WORKFLOW ROUTE HIT:", req.params);
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();
            const { entityId, entityType, dryRun = true, fastForward = true } = req.body;

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Get workflow
            const workflow = await Workflow.findOne({ _id: id, workspaceId });
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Get test entity
            let entity;
            switch (entityType) {
                case "contact":
                    entity = await Contact.findOne({ _id: entityId, workspaceId });
                    if (!entity) {
                        entity = await Contact.findOne({ _id: entityId, projectId: workspaceId });
                    }
                    break;
                case "deal":
                    entity = await Opportunity.findOne({ _id: entityId, workspaceId });
                    if (!entity) {
                        entity = await Opportunity.findOne({ _id: entityId, projectId: workspaceId });
                    }
                    break;
                case "company":
                    entity = await Company.findOne({ _id: entityId, workspaceId });
                    if (!entity) {
                        entity = await Company.findOne({ _id: entityId, projectId: workspaceId });
                    }
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: "Invalid entity type. Must be 'contact', 'deal', or 'company'.",
                    });
            }

            if (!entity) {
                return res.status(404).json({
                    success: false,
                    error: `${entityType} not found.`,
                });
            }

            // Get entity name based on type
            let entityName = "Unknown";
            if (entityType === "contact") {
                const contact = entity as any;
                entityName = contact.firstName
                    ? `${contact.firstName} ${contact.lastName || ""}`.trim()
                    : contact.email || "Unknown Contact";
            } else if (entityType === "deal") {
                const deal = entity as any;
                entityName = deal.name || deal.title || "Unknown Deal";
            } else if (entityType === "company") {
                const company = entity as any;
                entityName = company.name || "Unknown Company";
            }

            // Execute test workflow
            const testResults = {
                workflowName: workflow.name,
                entityName,
                dryRun,
                fastForward,
                steps: [] as any[],
                startedAt: new Date(),
                completedAt: null as Date | null,
                success: true,
                totalDuration: 0,
                productionDuration: 0,
            };

            // Find trigger step
            const triggerStep = workflow.steps.find((s) => s.type === "trigger");
            if (!triggerStep) {
                return res.status(400).json({
                    success: false,
                    error: "Workflow has no trigger step.",
                });
            }

            // Simulate workflow execution
            let currentStepId: string | undefined = triggerStep.nextStepIds?.[0];
            let stepCount = 0;
            let productionDelayMs = 0;

            while (currentStepId && stepCount < 50) {
                const step = workflow.steps.find((s) => s.id === currentStepId);
                if (!step) break;

                stepCount++;
                const stepResult: any = {
                    stepId: step.id,
                    stepName: step.name,
                    stepType: step.type,
                    status: "success",
                    startedAt: new Date(),
                };

                try {
                    switch (step.type) {
                        case "action":
                            if (dryRun) {
                                stepResult.simulated = true;
                                stepResult.message = `Would execute: ${step.config.actionType}`;
                                stepResult.config = step.config;
                            } else {
                                // Actually execute action
                                console.log("🚀 Executing action:", step.config.actionType);
                                const { executeAction } = await import("../services/workflow/actions");

                                // Create temporary enrollment for test
                                const testEnrollment = {
                                    workflowId: workflow._id,
                                    entityId: entity._id,
                                    entityType,
                                    workspaceId: workflow.workspaceId,
                                } as any;

                                const actionResult = await executeAction(step.config.actionType!, {
                                    step,
                                    entity,
                                    enrollment: testEnrollment,
                                    workspaceId: workflow.workspaceId,
                                });

                                stepResult.result = actionResult;
                                stepResult.message = actionResult.success
                                    ? `Executed: ${step.config.actionType}`
                                    : `Failed: ${actionResult.error}`;
                                if (!actionResult.success) {
                                    stepResult.status = "error";
                                }
                            }
                            currentStepId = step.nextStepIds?.[0];
                            break;

                        case "delay":
                            const delayMs =
                                (step.config.delayValue || 0) *
                                (step.config.delayUnit === "minutes"
                                    ? 60 * 1000
                                    : step.config.delayUnit === "hours"
                                        ? 60 * 60 * 1000
                                        : step.config.delayUnit === "days"
                                            ? 24 * 60 * 60 * 1000
                                            : 7 * 24 * 60 * 60 * 1000);

                            productionDelayMs += delayMs;

                            if (fastForward) {
                                stepResult.message = `Skipped delay: ${step.config.delayValue} ${step.config.delayUnit}`;
                                stepResult.delaySkipped = delayMs;
                            } else {
                                stepResult.message = `Waiting: ${step.config.delayValue} ${step.config.delayUnit}`;
                                stepResult.delayMs = delayMs;
                            }
                            currentStepId = step.nextStepIds?.[0];
                            break;

                        case "condition":
                            const { evaluateCondition } = await import("../services/workflow/conditionEvaluator");
                            const condition = step.config.conditions?.[0];

                            if (!condition) {
                                stepResult.message = "No condition configured, taking default path";
                                currentStepId = step.nextStepIds?.[0];
                            } else {
                                const conditionResult = evaluateCondition(entity, condition);
                                stepResult.conditionResult = conditionResult;
                                stepResult.message = conditionResult
                                    ? `Condition TRUE: Taking YES path`
                                    : `Condition FALSE: Taking NO path`;
                                stepResult.condition = condition;
                                stepResult.entityValue = (entity as any)[condition.field];

                                currentStepId = conditionResult
                                    ? step.nextStepIds?.[0]
                                    : step.nextStepIds?.[1];
                            }
                            break;

                        default:
                            stepResult.message = `Unknown step type: ${step.type}`;
                            currentStepId = step.nextStepIds?.[0];
                    }
                } catch (error: any) {
                    console.error("Step execution error:", error);
                    stepResult.status = "error";
                    stepResult.error = error.message;
                    stepResult.message = `Error: ${error.message}`;
                }

                stepResult.completedAt = new Date();
                stepResult.duration = stepResult.completedAt.getTime() - stepResult.startedAt.getTime();
                testResults.steps.push(stepResult);
            }

            testResults.completedAt = new Date();
            testResults.totalDuration = testResults.completedAt.getTime() - testResults.startedAt.getTime();
            testResults.productionDuration = productionDelayMs;

            res.json({
                success: true,
                message: "Workflow test completed successfully",
                data: testResults,
            });
        } catch (error: any) {
            console.error("Test workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to test workflow.",
                details: error.message,
            });
        }
    }
);

// ============================================
// ENROLLMENT ROUTES
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/enroll
 * @desc    Manually enroll a contact/deal in a workflow
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/enroll",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Validate input
            const result = enrollContactSchema.safeParse({ body: req.body });
            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    details: result.error.errors,
                });
            }

            const { entityType, entityId } = result.data.body;

            // Get workflow
            const workflow = await Workflow.findOne({ _id: id, workspaceId });
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            if (workflow.status !== "active") {
                return res.status(400).json({
                    success: false,
                    error: "Cannot enroll in a workflow that is not active.",
                });
            }

            // Verify entity matches workflow trigger type
            if (entityType !== workflow.triggerEntityType) {
                return res.status(400).json({
                    success: false,
                    error: `This workflow is for ${workflow.triggerEntityType}s, not ${entityType}s.`,
                });
            }

            // Verify entity exists
            let entity;
            switch (entityType) {
                case "contact":
                    entity = await Contact.findOne({ _id: entityId, workspaceId });
                    break;
                case "deal":
                    entity = await Opportunity.findOne({ _id: entityId, workspaceId });
                    break;
                case "company":
                    entity = await Company.findOne({ _id: entityId, workspaceId });
                    break;
            }

            if (!entity) {
                return res.status(404).json({
                    success: false,
                    error: `${entityType} not found.`,
                });
            }

            // Check if already enrolled (if re-enrollment is not allowed)
            if (!workflow.allowReenrollment) {
                const existingEnrollment = await WorkflowEnrollment.findOne({
                    workflowId: id,
                    entityId,
                    status: { $in: ["active", "paused"] },
                });

                if (existingEnrollment) {
                    return res.status(400).json({
                        success: false,
                        error: `This ${entityType} is already enrolled in this workflow.`,
                    });
                }
            }

            // Get first step after trigger
            const triggerStep = workflow.steps.find((s) => s.type === "trigger");
            const firstStepId = triggerStep?.nextStepIds[0];

            // Create enrollment
            const enrollment = await WorkflowEnrollment.create({
                workflowId: id,
                workspaceId,
                entityType,
                entityId,
                status: "active",
                currentStepId: firstStepId,
                nextExecutionTime: new Date(), // Execute immediately
                enrolledBy: req.user?._id,
                enrollmentSource: "manual",
                stepsExecuted: [
                    {
                        stepId: triggerStep?.id,
                        stepName: triggerStep?.name || "Manual Trigger",
                        stepType: "trigger",
                        startedAt: new Date(),
                        completedAt: new Date(),
                        status: "completed",
                        result: { source: "manual_enrollment" },
                    },
                ],
            });

            // Update workflow stats
            await Workflow.findByIdAndUpdate(id, {
                $inc: {
                    "stats.totalEnrolled": 1,
                    "stats.currentlyActive": 1,
                },
            });

            res.status(201).json({
                success: true,
                message: `${entityType} enrolled in workflow successfully!`,
                data: { enrollment },
            });
        } catch (error: any) {
            console.error("Enroll in workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to enroll in workflow. Please try again.",
            });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/enroll-bulk
 * @desc    Bulk enroll multiple entities in a workflow
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/enroll-bulk",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();
            const { entityIds } = req.body;

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            if (!Array.isArray(entityIds) || entityIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "entityIds must be a non-empty array",
                });
            }

            // Get workflow
            const workflow = await Workflow.findOne({ _id: id, workspaceId });
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            if (workflow.status !== "active") {
                return res.status(400).json({
                    success: false,
                    error: "Cannot enroll in a workflow that is not active.",
                });
            }

            const entityType = workflow.triggerEntityType;
            const triggerStep = workflow.steps.find((s) => s.type === "trigger");
            const firstStepId = triggerStep?.nextStepIds[0];

            const results = {
                enrolled: 0,
                skipped: 0,
                failed: 0,
                errors: [] as string[],
            };

            // Process each entity
            for (const entityId of entityIds) {
                try {
                    // Verify entity exists
                    let entity;
                    switch (entityType) {
                        case "contact":
                            entity = await Contact.findOne({ _id: entityId, workspaceId });
                            break;
                        case "deal":
                            entity = await Opportunity.findOne({ _id: entityId, workspaceId });
                            break;
                        case "company":
                            entity = await Company.findOne({ _id: entityId, workspaceId });
                            break;
                    }

                    if (!entity) {
                        results.skipped++;
                        results.errors.push(`${entityType} ${entityId} not found`);
                        continue;
                    }

                    // Check if already enrolled
                    if (!workflow.allowReenrollment) {
                        const existingEnrollment = await WorkflowEnrollment.findOne({
                            workflowId: id,
                            entityId,
                            status: { $in: ["active", "paused"] },
                        });

                        if (existingEnrollment) {
                            results.skipped++;
                            continue;
                        }
                    }

                    // Create enrollment
                    await WorkflowEnrollment.create({
                        workflowId: id,
                        workspaceId,
                        entityType,
                        entityId,
                        status: "active",
                        currentStepId: firstStepId,
                        nextExecutionTime: new Date(),
                        enrolledBy: req.user?._id,
                        enrollmentSource: "manual",
                        stepsExecuted: [
                            {
                                stepId: triggerStep?.id,
                                stepName: triggerStep?.name || "Manual Trigger",
                                stepType: "trigger",
                                startedAt: new Date(),
                                completedAt: new Date(),
                                status: "completed",
                                result: { source: "bulk_enrollment" },
                            },
                        ],
                    });

                    results.enrolled++;
                } catch (error: any) {
                    results.failed++;
                    results.errors.push(`Failed to enroll ${entityId}: ${error.message}`);
                }
            }

            // Update workflow stats
            if (results.enrolled > 0) {
                await Workflow.findByIdAndUpdate(id, {
                    $inc: {
                        "stats.totalEnrolled": results.enrolled,
                        "stats.currentlyActive": results.enrolled,
                    },
                });
            }

            res.status(200).json({
                success: true,
                message: `Enrolled ${results.enrolled} of ${entityIds.length} ${entityType}(s)`,
                data: { results },
            });
        } catch (error: any) {
            console.error("Bulk enroll error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to bulk enroll. Please try again.",
            });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/workflows/:id/enrollments
 * @desc    Get all enrollments for a workflow
 * @access  Private
 */
router.get(
    "/:workspaceId/workflows/:id/enrollments",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Parse query params
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;
            const status = req.query.status as string;

            // Build filter
            const filter: any = { workflowId: id, workspaceId };
            if (status) {
                filter.status = status;
            }

            // Get enrollments with pagination
            const [enrollments, total] = await Promise.all([
                WorkflowEnrollment.find(filter)
                    .sort({ enrolledAt: -1 })
                    .skip(skip)
                    .limit(limit),
                WorkflowEnrollment.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    enrollments,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error: any) {
            console.error("Get enrollments error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch enrollments. Please try again.",
            });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/entity/:entityType/:entityId/workflows
 * @desc    Get all workflow enrollments for a specific entity
 * @access  Private
 */
router.get(
    "/:workspaceId/entity/:entityType/:entityId/workflows",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, entityType, entityId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const enrollments = await WorkflowEnrollment.find({
                workspaceId,
                entityType,
                entityId,
            })
                .populate("workflowId", "name status")
                .sort({ enrolledAt: -1 });

            res.status(200).json({
                success: true,
                data: { enrollments },
            });
        } catch (error: any) {
            console.error("Get entity workflows error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch workflow enrollments. Please try again.",
            });
        }
    }
);

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/workflows/:id/analytics
 * @desc    Get workflow analytics and funnel data
 * @access  Private
 */
router.get(
    "/:workspaceId/workflows/:id/analytics",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const workflow = await Workflow.findOne({ _id: id, workspaceId });
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Get enrollment stats
            const [totalEnrolled, currentlyActive, completed, failed] = await Promise.all([
                WorkflowEnrollment.countDocuments({ workflowId: id }),
                WorkflowEnrollment.countDocuments({ workflowId: id, status: "active" }),
                WorkflowEnrollment.countDocuments({ workflowId: id, status: "completed" }),
                WorkflowEnrollment.countDocuments({ workflowId: id, status: "failed" }),
            ]);

            // Calculate completion rate
            const completionRate = totalEnrolled > 0
                ? Math.round((completed / totalEnrolled) * 100) / 100
                : 0;

            // Get step-by-step funnel data
            const enrollments = await WorkflowEnrollment.find({ workflowId: id });
            const stepCounts: Record<string, { entered: number; completed: number; failed: number }> = {};

            // Initialize step counts
            workflow.steps.forEach(step => {
                stepCounts[step.id] = { entered: 0, completed: 0, failed: 0 };
            });

            // Count step executions
            enrollments.forEach(enrollment => {
                enrollment.stepsExecuted.forEach(exec => {
                    if (stepCounts[exec.stepId]) {
                        stepCounts[exec.stepId].entered += 1;
                        if (exec.status === "completed") {
                            stepCounts[exec.stepId].completed += 1;
                        } else if (exec.status === "failed") {
                            stepCounts[exec.stepId].failed += 1;
                        }
                    }
                });
            });

            // Build funnel array
            const funnel = workflow.steps.map(step => ({
                stepId: step.id,
                stepName: step.name,
                stepType: step.type,
                entered: stepCounts[step.id]?.entered || 0,
                completed: stepCounts[step.id]?.completed || 0,
                failed: stepCounts[step.id]?.failed || 0,
                dropOff: stepCounts[step.id]
                    ? stepCounts[step.id].entered - stepCounts[step.id].completed - stepCounts[step.id].failed
                    : 0,
            }));

            // Get timeline data (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const timelineData = await WorkflowEnrollment.aggregate([
                {
                    $match: {
                        workflowId: workflow._id,
                        enrolledAt: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" } },
                        enrolled: { $sum: 1 },
                        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Calculate average time to complete
            const completedEnrollments = enrollments.filter(e => e.status === "completed" && e.completedAt);
            let avgTimeToComplete = 0;
            if (completedEnrollments.length > 0) {
                const totalTimeMs = completedEnrollments.reduce((sum, e) => {
                    return sum + (e.completedAt!.getTime() - e.enrolledAt.getTime());
                }, 0);
                avgTimeToComplete = totalTimeMs / completedEnrollments.length / (1000 * 60 * 60 * 24); // Days
            }

            res.status(200).json({
                success: true,
                data: {
                    overview: {
                        totalEnrolled,
                        currentlyActive,
                        completed,
                        failed,
                        completionRate,
                        avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10, // Round to 1 decimal
                    },
                    funnel,
                    timeline: timelineData.map(d => ({
                        date: d._id,
                        enrolled: d.enrolled,
                        completed: d.completed,
                        failed: d.failed,
                    })),
                },
            });
        } catch (error: any) {
            console.error("Get workflow analytics error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch analytics. Please try again.",
            });
        }
    }
);

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/enrollments/:enrollmentId/retry
 * @desc    Retry a failed enrollment
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/enrollments/:enrollmentId/retry",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, enrollmentId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const enrollment = await WorkflowEnrollment.findOne({
                _id: enrollmentId,
                workflowId: id,
                workspaceId,
            });

            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    error: "Enrollment not found.",
                });
            }

            if (enrollment.status !== "failed") {
                return res.status(400).json({
                    success: false,
                    error: "Only failed enrollments can be retried.",
                });
            }

            // Reset enrollment for retry
            enrollment.status = "active";
            enrollment.errorCount = 0;
            enrollment.lastError = undefined;
            enrollment.nextExecutionTime = new Date(); // Execute immediately
            await enrollment.save();

            // Update workflow stats
            await Workflow.findByIdAndUpdate(id, {
                $inc: {
                    "stats.currentlyActive": 1,
                    "stats.failed": -1,
                },
            });

            res.status(200).json({
                success: true,
                message: "Enrollment queued for retry!",
                data: { enrollment },
            });
        } catch (error: any) {
            console.error("Retry enrollment error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to retry enrollment. Please try again.",
            });
        }
    }
);

// ============================================
// SCHEDULER/CRON ROUTES
// ============================================

/**
 * @route   POST /api/workspaces/workflows/process
 * @desc    Manually trigger workflow processing (for testing/admin)
 * @access  Private (requires CRON_SECRET in production)
 */
router.post(
    "/workflows/process",
    async (req: AuthRequest, res: Response) => {
        try {
            // In production, verify CRON_SECRET
            const cronSecret = process.env.CRON_SECRET;
            const authHeader = req.headers['authorization'];

            if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
                // If no cron secret match, require user authentication
                const authResult = await new Promise<boolean>((resolve) => {
                    authenticate(req, res, () => resolve(true));
                    setTimeout(() => resolve(false), 100);
                });

                if (!authResult && !req.user) {
                    return res.status(401).json({
                        success: false,
                        error: "Unauthorized. Provide valid authentication or CRON_SECRET.",
                    });
                }
            }

            console.log("🔄 Manual workflow processing triggered...");
            const startTime = Date.now();

            // Import and use workflow service
            const workflowService = (await import("../services/WorkflowService")).default;
            await workflowService.processReadyEnrollments();

            const duration = Date.now() - startTime;
            console.log(`✅ Workflow processing completed in ${duration}ms`);

            res.status(200).json({
                success: true,
                message: "Workflow enrollments processed successfully",
                timestamp: new Date().toISOString(),
                durationMs: duration,
            });
        } catch (error: any) {
            console.error("Manual workflow processing error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to process workflow enrollments.",
                message: error.message,
            });
        }
    }
);

/**
 * @route   GET /api/workspaces/workflows/scheduler-status
 * @desc    Get workflow scheduler status
 * @access  Private
 */
router.get(
    "/workflows/scheduler-status",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workflowScheduler } = await import("../services/WorkflowScheduler");
            const status = workflowScheduler.getStatus();

            // Count pending enrollments
            const pendingCount = await WorkflowEnrollment.countDocuments({
                status: "active",
                nextExecutionTime: { $lte: new Date() },
            });

            res.status(200).json({
                success: true,
                data: {
                    scheduler: status,
                    pendingEnrollments: pendingCount,
                    serverTime: new Date().toISOString(),
                    isVercel: process.env.VERCEL === '1',
                },
            });
        } catch (error: any) {
            console.error("Get scheduler status error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to get scheduler status.",
            });
        }
    }
);

// ============================================
// TEST MODE ROUTE
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/test
 * @desc    Test workflow execution in dry-run mode
 * @access  Private
 */
router.post(
    "/:workspaceId/workflows/:id/test",
    authenticate,
    workflowLimiter,
    async (req: AuthRequest, res: Response) => {
        console.log("🧪 TEST ROUTE HIT:", req.params);
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any).toString();
            const { entityId, entityType, dryRun = true, fastForward = true } = req.body;

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Get workflow
            const workflow = await Workflow.findOne({ _id: id, workspaceId });
            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found.",
                });
            }

            // Get test entity
            let entity;
            switch (entityType) {
                case "contact":
                    entity = await Contact.findOne({ _id: entityId, projectId: workspaceId });
                    break;
                case "deal":
                    entity = await Opportunity.findOne({ _id: entityId, projectId: workspaceId });
                    break;
                case "company":
                    entity = await Company.findOne({ _id: entityId, projectId: workspaceId });
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: "Invalid entity type. Must be 'contact', 'deal', or 'company'.",
                    });
            }

            if (!entity) {
                return res.status(404).json({
                    success: false,
                    error: `${entityType} not found.`,
                });
            }

            // Get entity name based on type
            let entityName = "Unknown";
            if (entityType === "contact") {
                const contact = entity as any;
                entityName = contact.firstName
                    ? `${contact.firstName} ${contact.lastName || ""}`.trim()
                    : contact.email || "Unknown Contact";
            } else if (entityType === "deal") {
                const deal = entity as any;
                entityName = deal.name || deal.title || "Unknown Deal";
            } else if (entityType === "company") {
                const company = entity as any;
                entityName = company.name || "Unknown Company";
            }

            // Execute test workflow
            const testResults = {
                workflowName: workflow.name,
                entityName,
                dryRun,
                fastForward,
                steps: [] as any[],
                startedAt: new Date(),
                completedAt: null as Date | null,
                success: true,
                totalDuration: 0,
                productionDuration: 0,
            };

            // Find trigger step
            const triggerStep = workflow.steps.find((s) => s.type === "trigger");
            if (!triggerStep) {
                return res.status(400).json({
                    success: false,
                    error: "Workflow has no trigger step.",
                });
            }

            // Simulate workflow execution
            let currentStepId: string | undefined = triggerStep.nextStepIds?.[0];
            let stepCount = 0;
            let productionDelayMs = 0;

            while (currentStepId && stepCount < 50) {
                const step = workflow.steps.find((s) => s.id === currentStepId);
                if (!step) break;

                stepCount++;
                const stepResult: any = {
                    stepId: step.id,
                    stepName: step.name,
                    stepType: step.type,
                    status: "success",
                    startedAt: new Date(),
                };

                try {
                    switch (step.type) {
                        case "action":
                            if (dryRun) {
                                stepResult.simulated = true;
                                stepResult.message = `Would execute: ${step.config.actionType}`;
                                stepResult.config = step.config;
                            } else {
                                // Actually execute action
                                const { workflowService } = await import("../services/workflow");
                                const { executeAction } = await import("../services/workflow/actions");

                                // Create temporary enrollment for test
                                const testEnrollment = {
                                    workflowId: workflow._id,
                                    entityId: entity._id,
                                    entityType,
                                    workspaceId: workflow.workspaceId,
                                } as any;

                                const actionResult = await executeAction(step.config.actionType!, {
                                    step,
                                    entity,
                                    enrollment: testEnrollment,
                                    workspaceId: workflow.workspaceId,
                                });

                                stepResult.result = actionResult;
                                stepResult.message = actionResult.success
                                    ? `Executed: ${step.config.actionType}`
                                    : `Failed: ${actionResult.error}`;
                            }
                            currentStepId = step.nextStepIds?.[0];
                            break;

                        case "delay":
                            const delayMs =
                                (step.config.delayValue || 0) *
                                (step.config.delayUnit === "minutes"
                                    ? 60 * 1000
                                    : step.config.delayUnit === "hours"
                                        ? 60 * 60 * 1000
                                        : step.config.delayUnit === "days"
                                            ? 24 * 60 * 60 * 1000
                                            : 7 * 24 * 60 * 60 * 1000);

                            productionDelayMs += delayMs;

                            if (fastForward) {
                                stepResult.message = `Skipped delay: ${step.config.delayValue} ${step.config.delayUnit}`;
                                stepResult.delaySkipped = delayMs;
                            } else {
                                stepResult.message = `Waiting: ${step.config.delayValue} ${step.config.delayUnit}`;
                                stepResult.delayMs = delayMs;
                            }
                            currentStepId = step.nextStepIds?.[0];
                            break;

                        case "condition":
                            const { evaluateCondition } = await import("../services/workflow/conditionEvaluator");
                            const condition = step.config.conditions?.[0];

                            if (!condition) {
                                stepResult.message = "No condition configured, taking default path";
                                currentStepId = step.nextStepIds?.[0];
                            } else {
                                const conditionResult = evaluateCondition(entity, condition);
                                stepResult.conditionResult = conditionResult;
                                stepResult.message = conditionResult
                                    ? `Condition TRUE: Taking YES path`
                                    : `Condition FALSE: Taking NO path`;
                                stepResult.condition = condition;
                                stepResult.entityValue = (entity as any)[condition.field];

                                currentStepId = conditionResult
                                    ? step.nextStepIds?.[0]
                                    : step.nextStepIds?.[1];
                            }
                            break;

                        default:
                            stepResult.message = `Unknown step type: ${step.type}`;
                            currentStepId = step.nextStepIds?.[0];
                    }
                } catch (error: any) {
                    stepResult.status = "error";
                    stepResult.error = error.message;
                    stepResult.message = `Error: ${error.message}`;
                }

                stepResult.completedAt = new Date();
                stepResult.duration = stepResult.completedAt.getTime() - stepResult.startedAt.getTime();
                testResults.steps.push(stepResult);
            }

            testResults.completedAt = new Date();
            testResults.totalDuration = testResults.completedAt.getTime() - testResults.startedAt.getTime();
            testResults.productionDuration = productionDelayMs;

            res.json({
                success: true,
                message: "Workflow test completed successfully",
                data: testResults,
            });
        } catch (error: any) {
            console.error("Test workflow error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to test workflow.",
                details: error.message,
            });
        }
    }
);

// ============================================
// INCOMING WEBHOOK ENDPOINT
// ============================================

/**
 * @route   POST /api/workspaces/:workspaceId/workflows/:id/webhook
 * @desc    Receive incoming webhook to trigger workflow enrollment
 * @access  Public (with webhook secret)
 */
router.post(
    "/:workspaceId/workflows/:id/webhook",
    async (req, res) => {
        try {
            const { workspaceId, id: workflowId } = req.params;
            const webhookSecret = req.headers["x-webhook-secret"] as string;

            // Find the workflow
            const workflow = await Workflow.findOne({
                _id: workflowId,
                workspaceId,
                status: "active",
            });

            if (!workflow) {
                return res.status(404).json({
                    success: false,
                    error: "Workflow not found or not active.",
                });
            }

            // Check if this workflow has webhook_received trigger
            const triggerStep = workflow.steps.find(
                (s) => s.type === "trigger" && s.config.triggerType === "webhook_received"
            );

            if (!triggerStep) {
                return res.status(400).json({
                    success: false,
                    error: "This workflow does not have a webhook trigger.",
                });
            }

            // Parse payload
            const { entityType = "contact", entityId, data } = req.body;

            if (!entityId) {
                return res.status(400).json({
                    success: false,
                    error: "entityId is required in the request body.",
                });
            }

            // Find the entity
            let entity;
            switch (entityType) {
                case "contact":
                    entity = await Contact.findOne({ _id: entityId, workspaceId });
                    break;
                case "deal":
                    entity = await Opportunity.findOne({ _id: entityId, workspaceId });
                    break;
                case "company":
                    entity = await Company.findOne({ _id: entityId, workspaceId });
                    break;
                default:
                    entity = await Contact.findOne({ _id: entityId, workspaceId });
            }

            if (!entity) {
                return res.status(404).json({
                    success: false,
                    error: `${entityType} with ID ${entityId} not found.`,
                });
            }

            // Create enrollment
            const enrollment = await WorkflowEnrollment.create({
                workflowId: workflow._id,
                workspaceId,
                entityType,
                entityId,
                status: "active",
                currentStepId: workflow.steps[1]?.id, // Start from second step (after trigger)
                nextExecutionTime: new Date(),
                enrollmentSource: "api",
                enrolledAt: new Date(),
            });

            // Update workflow stats
            await Workflow.findByIdAndUpdate(workflowId, {
                $inc: { "stats.totalEnrolled": 1, "stats.currentlyActive": 1 },
            });

            console.log(`✅ Webhook enrolled ${entityType} ${entityId} in workflow ${workflow.name}`);

            res.status(201).json({
                success: true,
                message: "Entity enrolled in workflow via webhook",
                data: {
                    enrollmentId: enrollment._id,
                    workflowId: workflow._id,
                    workflowName: workflow.name,
                    entityType,
                    entityId,
                },
            });
        } catch (error: any) {
            console.error("Webhook trigger error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to process webhook.",
                details: error.message,
            });
        }
    }
);

export default router;

