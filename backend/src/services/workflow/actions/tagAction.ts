/**
 * Tag Action Executors
 * 
 * Add and remove tags from entities as part of workflow automation.
 */

import { getEntityModel } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

// ============================================
// ADD TAG ACTION
// ============================================

export class AddTagActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { tagName } = step.config;

        if (!tagName) {
            return this.skipped("No tag specified");
        }

        // Check if tag already exists
        const existingTags = entity.tags || [];
        if (existingTags.includes(tagName)) {
            return this.skipped(`Tag "${tagName}" already exists`);
        }

        // Add tag to entity
        const Model = getEntityModel(enrollment.entityType);
        await Model.findByIdAndUpdate(entity._id, {
            $addToSet: { tags: tagName },
        });

        this.log(`🏷️ Added tag: "${tagName}"`);

        return this.success({ added: true, tag: tagName });
    }
}

// ============================================
// REMOVE TAG ACTION
// ============================================

export class RemoveTagActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { tagName } = step.config;

        if (!tagName) {
            return this.skipped("No tag specified");
        }

        // Check if tag exists
        const existingTags = entity.tags || [];
        if (!existingTags.includes(tagName)) {
            return this.skipped(`Tag "${tagName}" not found`);
        }

        // Remove tag from entity
        const Model = getEntityModel(enrollment.entityType);
        await Model.findByIdAndUpdate(entity._id, {
            $pull: { tags: tagName },
        });

        this.log(`🏷️ Removed tag: "${tagName}"`);

        return this.success({ removed: true, tag: tagName });
    }
}

export const addTagAction = new AddTagActionExecutor();
export const removeTagAction = new RemoveTagActionExecutor();
