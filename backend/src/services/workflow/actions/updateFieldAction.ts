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

        // Log activity
        await Activity.create({
            workspaceId: enrollment.workspaceId,
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "automation",
            title: "Workflow: Field Updated",
            description: `Changed ${fieldName} from "${oldValue}" to "${fieldValue}"`,
            metadata: {
                workflowId: enrollment.workflowId,
                stepId: step.id,
                field: fieldName,
                oldValue,
                newValue: fieldValue,
            },
        });

        return this.success({
            updated: true,
            field: fieldName,
            oldValue,
            newValue: fieldValue,
        });
    }
}

export default new UpdateFieldActionExecutor();
