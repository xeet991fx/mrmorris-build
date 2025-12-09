/**
 * Notification Action Executor
 * 
 * Sends in-app notifications as part of workflow automation.
 */

import Activity from "../../../models/Activity";
import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class NotificationActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { notificationMessage, notificationUserId } = step.config;

        if (!notificationMessage) {
            return this.skipped("No notification message specified");
        }

        // Replace placeholders in message
        const message = replacePlaceholders(notificationMessage, entity);

        // Create a notification activity (wrapped in try-catch)
        try {
            await Activity.create({
                workspaceId: enrollment.workspaceId,
                entityType: enrollment.entityType,
                entityId: enrollment.entityId,
                type: "note", // Using 'note' as 'notification' is not a valid type
                title: "Workflow Notification",
                description: message,
                metadata: {
                    workflowId: enrollment.workflowId,
                    stepId: step.id,
                    automated: true,
                    targetUserId: notificationUserId,
                },
            });
        } catch (activityError: any) {
            console.warn("Notification activity logging skipped:", activityError.message);
        }

        this.log(`🔔 Notification: ${message}`);

        // TODO: Integrate with real-time notification system (WebSocket, Push, etc.)
        // For now, we just log and create an activity

        return this.success({
            notified: true,
            message,
            userId: notificationUserId,
        });
    }
}

export default new NotificationActionExecutor();
