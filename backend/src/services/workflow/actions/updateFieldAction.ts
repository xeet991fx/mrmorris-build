/**
 * Update Field Action Executor
 * 
 * Updates a field on the entity as part of workflow automation.
 */

import Activity from "../../../models/Activity";
import { getEntityModel } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class UpdateFieldActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { fieldName, fieldValue } = step.config;

        if (!fieldName) {
            return this.skipped("No field specified");
        }

        const oldValue = entity[fieldName];

        // Update the entity
        const Model = getEntityModel(enrollment.entityType);
        await Model.findByIdAndUpdate(entity._id, {
            [fieldName]: fieldValue,
            updatedAt: new Date(),
        });

        this.log(`✏️ Updated ${fieldName}: "${oldValue}" → "${fieldValue}"`);

        // Log activity (optional - wrapped in try-catch to avoid failing workflow)
        try {
            await Activity.create({
                workspaceId: enrollment.workspaceId,
                entityType: enrollment.entityType,
                entityId: enrollment.entityId,
                type: "note", // Using 'note' as 'automation' is not a valid type
                title: "Workflow: Field Updated",
                description: `Changed ${fieldName} from "${oldValue}" to "${fieldValue}"`,
                metadata: {
                    workflowId: enrollment.workflowId,
                    stepId: step.id,
                    field: fieldName,
                    oldValue,
                    newValue: fieldValue,
                    automated: true,
                },
            });
        } catch (activityError: any) {
            // Don't fail workflow if Activity logging fails
            console.warn("Activity logging skipped:", activityError.message);
        }

        return this.success({
            updated: true,
            field: fieldName,
            oldValue,
            newValue: fieldValue,
        });
    }
}

export default new UpdateFieldActionExecutor();
