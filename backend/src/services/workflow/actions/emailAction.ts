/**
 * Email Action Executor
 * 
 * Sends automated emails to contacts as part of workflow automation.
 */

import Activity from "../../../models/Activity";
import emailService from "../../email";
import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

export class EmailActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { emailSubject, emailBody } = step.config;

        // Validate email exists
        if (!entity.email) {
            return this.skipped("No email address on entity");
        }

        // Replace placeholders in subject and body
        const subject = replacePlaceholders(emailSubject || "Automated Message", entity);
        const body = replacePlaceholders(emailBody || "", entity);

        // Build entity data for email template
        const entityData = {
            firstName: entity.firstName || "",
            lastName: entity.lastName || "",
            name: entity.name || `${entity.firstName || ""} ${entity.lastName || ""}`.trim(),
            email: entity.email,
            phone: entity.phone || "",
            company: entity.company || "",
            status: entity.status || "",
            source: entity.source || "",
        };

        // Send the email
        const result = await emailService.sendWorkflowEmail(
            entity.email,
            subject,
            body,
            entityData
        );

        if (!result.success) {
            this.log(`❌ Failed to send workflow email: ${result.error}`);
            return this.error(result.error || "Failed to send email");
        }

        this.log(`📧 Workflow email sent to ${entity.email}: "${subject}"`);

        // Log activity
        await Activity.create({
            workspaceId: enrollment.workspaceId,
            entityType: enrollment.entityType,
            entityId: enrollment.entityId,
            type: "automation",
            title: "Workflow: Email Sent",
            description: `Automated email sent: "${subject}"`,
            metadata: {
                workflowId: enrollment.workflowId,
                stepId: step.id,
                emailSubject: subject,
                messageId: result.messageId,
            },
        });

        return this.success({
            sent: true,
            to: entity.email,
            subject,
            messageId: result.messageId,
        });
    }
}

export default new EmailActionExecutor();
