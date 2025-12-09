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

        // Create a notification activity
        await Activity.create({
            workspaceId: enrollment.workspaceId,
            userId: notificationUserId, // The user being notified
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "note", // Using 'note' as 'notification' is not a valid type
            title: "Workflow Notification",
            description: message,
            workflowId: enrollment.workflowId,
            workflowEnrollmentId: enrollment._id,
            workflowStepId: step.id,
            automated: true,
            metadata: {
                targetUserId: notificationUserId,
            },
        });

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
