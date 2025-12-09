/**
 * Enroll Workflow Action Executor
 * 
 * Enrolls the current entity into another workflow.
 * Similar to HubSpot's "Enroll in another workflow" action.
 */

import Workflow from "../../../models/Workflow";
import Activity from "../../../models/Activity";
import { enrollEntity, isEnrolled } from "../enrollmentManager";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class EnrollWorkflowActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { targetWorkflowId } = step.config;

        if (!targetWorkflowId) {
            return this.skipped("No target workflow specified");
        }

        // Prevent self-enrollment (circular)
        if (targetWorkflowId === enrollment.workflowId.toString()) {
            return this.skipped("Cannot enroll in the same workflow (circular reference)");
        }

        // Get target workflow
        const targetWorkflow = await Workflow.findById(targetWorkflowId);
        if (!targetWorkflow) {
            return this.error(`Target workflow not found: ${targetWorkflowId}`);
        }

        // Check if workflow is active
        if (targetWorkflow.status !== "active") {
            return this.skipped(`Target workflow "${targetWorkflow.name}" is not active`);
        }

        // Check if already enrolled (unless re-enrollment is allowed)
        const alreadyEnrolled = await isEnrolled(targetWorkflowId, entity._id);
        if (alreadyEnrolled && !targetWorkflow.allowReenrollment) {
            return this.skipped(`Already enrolled in "${targetWorkflow.name}" and re-enrollment is disabled`);
        }

        // Enroll the entity
        const newEnrollment = await enrollEntity(
            targetWorkflow,
            entity._id,
            enrollment.entityType,
            enrollment.workspaceId.toString(),
            undefined,
            "automatic" // Enrolled by workflow
        );

        this.log(`🔄 Enrolled in workflow: "${targetWorkflow.name}"`);

        // Log activity (wrapped in try-catch to avoid failing workflow)
        try {
            await Activity.create({
                workspaceId: enrollment.workspaceId,
                entityType: enrollment.entityType,
                entityId: enrollment.entityId,
                type: "note", // Using 'note' as 'automation' is not valid
                title: "Workflow: Enrolled in Another Workflow",
                description: `Enrolled in "${targetWorkflow.name}"`,
                metadata: {
                    sourceWorkflowId: enrollment.workflowId,
                    targetWorkflowId,
                    targetWorkflowName: targetWorkflow.name,
                    newEnrollmentId: newEnrollment._id,
                    stepId: step.id,
                    automated: true,
                },
            });
        } catch (activityError: any) {
            console.warn("Activity logging skipped:", activityError.message);
        }

        return this.success({
            enrolled: true,
            targetWorkflowId,
            targetWorkflowName: targetWorkflow.name,
            newEnrollmentId: newEnrollment._id?.toString(),
        });
    }
}

export default new EnrollWorkflowActionExecutor();
