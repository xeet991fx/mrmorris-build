import { Types } from "mongoose";
import Notification, { NotificationType } from "../models/Notification";

/**
 * Notification Service
 * 
 * Handles creation and management of in-app notifications.
 * Used by other services to trigger notifications for users.
 */

interface CreateNotificationInput {
    userId: string;
    workspaceId?: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    priority?: "low" | "normal" | "high";
    expiresAt?: Date;
}

class NotificationService {
    /**
     * Create a single notification
     */
    async create(input: CreateNotificationInput): Promise<void> {
        try {
            await Notification.create({
                userId: new Types.ObjectId(input.userId),
                workspaceId: input.workspaceId ? new Types.ObjectId(input.workspaceId) : undefined,
                type: input.type,
                title: input.title,
                message: input.message,
                actionUrl: input.actionUrl,
                actionLabel: input.actionLabel,
                metadata: input.metadata,
                priority: input.priority || "normal",
                expiresAt: input.expiresAt,
            });
        } catch (error) {
            console.error("Failed to create notification:", error);
            // Don't throw - notifications shouldn't break main flows
        }
    }

    /**
     * Notify about a task assignment
     */
    async notifyTaskAssigned(
        userId: string,
        workspaceId: string,
        task: { _id: string; title: string },
        assignedBy: { name: string }
    ): Promise<void> {
        await this.create({
            userId,
            workspaceId,
            type: "task_assigned",
            title: "New Task Assigned",
            message: `${assignedBy.name} assigned you a task: ${task.title}`,
            actionUrl: `/projects/${workspaceId}/tasks?taskId=${task._id}`,
            actionLabel: "View Task",
            metadata: { taskId: task._id, taskTitle: task.title },
        });
    }

    /**
     * Notify about task completion
     */
    async notifyTaskCompleted(
        userId: string,
        workspaceId: string,
        task: { _id: string; title: string },
        completedBy: { name: string }
    ): Promise<void> {
        await this.create({
            userId,
            workspaceId,
            type: "task_completed",
            title: "Task Completed",
            message: `${completedBy.name} completed the task: ${task.title}`,
            actionUrl: `/projects/${workspaceId}/tasks?taskId=${task._id}`,
            metadata: { taskId: task._id },
        });
    }

    /**
     * Notify about deal stage change
     */
    async notifyDealStageChange(
        userId: string,
        workspaceId: string,
        deal: { _id: string; title: string },
        fromStage: string,
        toStage: string
    ): Promise<void> {
        await this.create({
            userId,
            workspaceId,
            type: "deal_stage_change",
            title: "Deal Stage Changed",
            message: `${deal.title} moved from ${fromStage} to ${toStage}`,
            actionUrl: `/projects/${workspaceId}/pipelines?dealId=${deal._id}`,
            metadata: { dealId: deal._id, fromStage, toStage },
        });
    }

    /**
     * Notify about deal won
     */
    async notifyDealWon(
        userId: string,
        workspaceId: string,
        deal: { _id: string; title: string; value: number }
    ): Promise<void> {
        await this.create({
            userId,
            workspaceId,
            type: "deal_won",
            title: "🎉 Deal Won!",
            message: `Congratulations! ${deal.title} (${deal.value.toLocaleString()}) has been won!`,
            actionUrl: `/projects/${workspaceId}/pipelines?dealId=${deal._id}`,
            priority: "high",
            metadata: { dealId: deal._id, value: deal.value },
        });
    }

    /**
     * Notify about meeting reminder
     */
    async notifyMeetingReminder(
        userId: string,
        workspaceId: string,
        meeting: { _id: string; title: string; startTime: Date }
    ): Promise<void> {
        const timeUntil = Math.round((meeting.startTime.getTime() - Date.now()) / 60000);
        await this.create({
            userId,
            workspaceId,
            type: "meeting_reminder",
            title: "Upcoming Meeting",
            message: `${meeting.title} starts in ${timeUntil} minutes`,
            actionUrl: `/projects/${workspaceId}/meetings?meetingId=${meeting._id}`,
            priority: "high",
            metadata: { meetingId: meeting._id },
        });
    }

    /**
     * Notify about workflow completion
     */
    async notifyWorkflowCompleted(
        userId: string,
        workspaceId: string,
        workflow: { _id: string; name: string },
        contact: { firstName: string; lastName: string }
    ): Promise<void> {
        await this.create({
            userId,
            workspaceId,
            type: "workflow_completed",
            title: "Workflow Completed",
            message: `${workflow.name} completed for ${contact.firstName} ${contact.lastName}`,
            actionUrl: `/projects/${workspaceId}/workflows/${workflow._id}`,
            metadata: { workflowId: workflow._id },
        });
    }

    /**
     * Notify team about new member invitation
     */
    async notifyTeamInvite(
        userId: string,
        workspaceId: string,
        invitedBy: { name: string },
        role: string
    ): Promise<void> {
        await this.create({
            userId,
            workspaceId,
            type: "team_invite",
            title: "Team Invitation",
            message: `${invitedBy.name} invited you as ${role}`,
            actionUrl: `/projects/${workspaceId}/settings/team`,
            priority: "high",
        });
    }

    /**
     * Send system notification
     */
    async sendSystemNotification(
        userId: string,
        title: string,
        message: string,
        actionUrl?: string
    ): Promise<void> {
        await this.create({
            userId,
            type: "system",
            title,
            message,
            actionUrl,
        });
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return Notification.countDocuments({
            userId: new Types.ObjectId(userId),
            read: false,
        });
    }

    /**
     * Clean up old notifications (call periodically)
     */
    async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);

        const result = await Notification.deleteMany({
            createdAt: { $lt: cutoff },
            read: true, // Only delete read notifications
        });

        return result.deletedCount;
    }
}

export const notificationService = new NotificationService();
export default notificationService;
