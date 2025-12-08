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

        // Create activity as a task
        const task = await Activity.create({
            workspaceId: enrollment.workspaceId,
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "task",
            title,
            description,
            dueAt: dueDate,
            assignedTo: taskAssignee,
            status: "pending",
            metadata: {
                workflowId: enrollment.workflowId,
                stepId: step.id,
                automated: true,
            },
        });

        this.log(`📋 Created task: "${title}" (due: ${dueDate.toLocaleDateString()})`);

        return this.success({
            created: true,
            taskId: task._id,
            title,
            dueDate: dueDate.toISOString(),
        });
    }
}

export default new TaskActionExecutor();
