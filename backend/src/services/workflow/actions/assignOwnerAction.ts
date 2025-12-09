/**
 * Assign Owner Action Executor
 * 
 * Assigns a new owner to the entity as part of workflow automation.
 * Similar to HubSpot's "Set property owner" action.
 */

import mongoose from "mongoose";
import Activity from "../../../models/Activity";
import User from "../../../models/User";
import { getEntityModel } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class AssignOwnerActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { taskAssignee } = step.config; // reusing taskAssignee field for owner

        if (!taskAssignee) {
            return this.skipped("No owner specified");
        }

        // Validate owner exists
        const newOwner = await User.findById(taskAssignee);
        if (!newOwner) {
            return this.error(`User not found: ${taskAssignee}`);
        }

        const oldOwnerId = entity.ownerId?.toString() || entity.userId?.toString();
        let oldOwnerName = "Unassigned";

        // Get old owner name if exists
        if (oldOwnerId) {
            const oldOwner = await User.findById(oldOwnerId);
            if (oldOwner) {
                oldOwnerName = oldOwner.name || oldOwner.email;
            }
        }

        // Update the entity
        const Model = getEntityModel(enrollment.entityType);

        // Try ownerId first, fallback to userId for backwards compatibility
        const updateField = entity.ownerId !== undefined ? "ownerId" : "userId";

        await Model.findByIdAndUpdate(entity._id, {
            [updateField]: new mongoose.Types.ObjectId(taskAssignee),
            updatedAt: new Date(),
        });

        const newOwnerName = newOwner.name || newOwner.email;
        this.log(`👤 Assigned owner: "${oldOwnerName}" → "${newOwnerName}"`);

        // Log activity (wrapped in try-catch to avoid failing workflow)
        try {
            await Activity.create({
                workspaceId: enrollment.workspaceId,
                entityType: enrollment.entityType,
                entityId: enrollment.entityId,
                type: "note", // Using 'note' as 'automation' is not valid
                title: "Workflow: Owner Assigned",
                description: `Changed owner from "${oldOwnerName}" to "${newOwnerName}"`,
                metadata: {
                    workflowId: enrollment.workflowId,
                    stepId: step.id,
                    oldOwnerId,
                    newOwnerId: taskAssignee,
                    oldOwnerName,
                    newOwnerName,
                    automated: true,
                },
            });
        } catch (activityError: any) {
            console.warn("Activity logging skipped:", activityError.message);
        }

        return this.success({
            assigned: true,
            oldOwnerId,
            newOwnerId: taskAssignee,
            newOwnerName,
        });
    }
}

export default new AssignOwnerActionExecutor();
