/**
 * Task Action Executor
 * 
 * Creates tasks/activities as part of workflow automation.
 */

import Activity from "../../../models/Activity";
import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class TaskActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { taskTitle, taskDescription, taskDueInDays, taskAssignee } = step.config;

        // Calculate due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (taskDueInDays || 0));

        // Replace placeholders
        const title = replacePlaceholders(taskTitle || "Follow up", entity);
        const description = replacePlaceholders(taskDescription || "", entity);

        // Create activity as a task (wrapped in try-catch)
        let taskId: string | undefined;
        try {
            const task = await Activity.create({
                workspaceId: enrollment.workspaceId,
                entityType: enrollment.entityType,
                entityId: enrollment.entityId,
                type: "task",
                title,
                description,
                dueDate: dueDate,
                metadata: {
                    workflowId: enrollment.workflowId,
                    stepId: step.id,
                    automated: true,
                    assignedTo: taskAssignee,
                },
            });
            taskId = task._id?.toString();
        } catch (activityError: any) {
            console.warn("Task creation failed:", activityError.message);
            // For task action, we should report the error but not fail
        }

        this.log(`📋 Created task: "${title}" (due: ${dueDate.toLocaleDateString()})`);

        return this.success({
            created: !!taskId,
            taskId,
            title,
            dueDate: dueDate.toISOString(),
        });
    }
}

export default new TaskActionExecutor();
