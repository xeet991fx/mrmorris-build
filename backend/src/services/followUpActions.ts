/**
 * Follow-up Actions Service
 *
 * Executes automated follow-up actions after form submission:
 * - Send emails
 * - Create tasks
 * - Trigger webhooks
 * - Send Slack notifications
 */

import { Types } from "mongoose";
import { IFollowUpAction } from "../models/Form";
import emailService from "./email";
import Task from "../models/Task";
import axios from "axios";

interface ActionContext {
    submissionData: Record<string, any>;
    contactId?: Types.ObjectId;
    formName: string;
    workspaceId: Types.ObjectId;
    submissionId: string;
}

/**
 * Replace template variables in a string
 * Supports: {field_id}, {contact_id}, {form_name}, {submission_id}
 */
function replaceTemplateVariables(template: string, context: ActionContext): string {
    let result = template;

    // Replace form metadata
    result = result.replace(/\{form_name\}/g, context.formName);
    result = result.replace(/\{submission_id\}/g, context.submissionId);
    result = result.replace(/\{contact_id\}/g, context.contactId?.toString() || '');

    // Replace field values - match {field_*} or any field ID
    Object.keys(context.submissionData).forEach(fieldId => {
        const value = context.submissionData[fieldId];
        const regex = new RegExp(`\\{${fieldId}\\}`, 'g');
        result = result.replace(regex, String(value || ''));
    });

    return result;
}

/**
 * Check if action should be triggered based on conditions
 */
function shouldTriggerAction(
    action: IFollowUpAction,
    submissionData: Record<string, any>
): boolean {
    if (!action.enabled) {
        return false;
    }

    // If no trigger conditions, always trigger
    if (!action.triggerConditions || action.triggerConditions.length === 0) {
        return true;
    }

    // All conditions must match (AND logic)
    return action.triggerConditions.every(condition => {
        const fieldValue = submissionData[condition.fieldId];
        const compareValue = condition.value;

        switch (condition.operator) {
            case 'equals':
                return String(fieldValue).toLowerCase() === compareValue.toLowerCase();
            case 'notEquals':
                return String(fieldValue).toLowerCase() !== compareValue.toLowerCase();
            case 'contains':
                return String(fieldValue).toLowerCase().includes(compareValue.toLowerCase());
            case 'greaterThan':
                return parseFloat(fieldValue) > parseFloat(compareValue);
            case 'lessThan':
                return parseFloat(fieldValue) < parseFloat(compareValue);
            default:
                return false;
        }
    });
}

/**
 * Execute email action
 */
async function executeEmailAction(
    action: IFollowUpAction,
    context: ActionContext
): Promise<void> {
    if (!action.emailConfig) {
        throw new Error("Email config missing");
    }

    const { to, subject, body } = action.emailConfig;

    // Replace template variables
    const recipientEmail = replaceTemplateVariables(to, context);
    const emailSubject = replaceTemplateVariables(subject, context);
    const emailBody = replaceTemplateVariables(body, context);

    // Send email using workflow email method
    await emailService.sendWorkflowEmail(
        recipientEmail,
        emailSubject,
        emailBody,
        context.submissionData
    );

    console.log(`✅ Follow-up email sent to: ${recipientEmail}`);
}

/**
 * Execute task creation action
 */
async function executeTaskAction(
    action: IFollowUpAction,
    context: ActionContext
): Promise<void> {
    if (!action.taskConfig) {
        throw new Error("Task config missing");
    }

    const { assignTo, title, description, dueInDays, priority } = action.taskConfig;

    // Calculate due date
    let dueDate: Date | undefined;
    if (dueInDays) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueInDays);
    }

    // Replace template variables
    const taskTitle = replaceTemplateVariables(title, context);
    const taskDescription = description ? replaceTemplateVariables(description, context) : undefined;

    // Determine assignee
    let assigneeId = assignTo;
    if (assignTo === '{owner}' && context.contactId) {
        // Get contact owner if {owner} is specified
        const Contact = require("../models/Contact").default;
        const contact = await Contact.findById(context.contactId).select('ownerId');
        assigneeId = contact?.ownerId?.toString();
    }

    // Create task
    await Task.create({
        workspaceId: context.workspaceId,
        title: taskTitle,
        description: taskDescription,
        assignedTo: assigneeId,
        relatedTo: context.contactId,
        relatedToModel: 'Contact',
        dueDate,
        priority: priority || 'medium',
        status: 'pending',
    });

    console.log(`✅ Follow-up task created: ${taskTitle}`);
}

/**
 * Execute webhook action
 */
async function executeWebhookAction(
    action: IFollowUpAction,
    context: ActionContext
): Promise<void> {
    if (!action.webhookConfig) {
        throw new Error("Webhook config missing");
    }

    const { url, method, headers, body } = action.webhookConfig;

    // Replace template variables in URL and body
    const webhookUrl = replaceTemplateVariables(url, context);
    const webhookBody = body ? replaceTemplateVariables(body, context) : null;

    // Prepare payload
    const payload = webhookBody ? JSON.parse(webhookBody) : {
        formName: context.formName,
        submissionId: context.submissionId,
        contactId: context.contactId?.toString(),
        data: context.submissionData,
        timestamp: new Date().toISOString(),
    };

    // Send webhook
    const response = await axios({
        method: method || 'POST',
        url: webhookUrl,
        headers: headers || { 'Content-Type': 'application/json' },
        data: payload,
        timeout: 10000, // 10 second timeout
    });

    console.log(`✅ Webhook triggered: ${webhookUrl} (Status: ${response.status})`);
}

/**
 * Execute Slack notification action
 */
async function executeSlackAction(
    action: IFollowUpAction,
    context: ActionContext
): Promise<void> {
    // For Slack, we can use webhookConfig
    if (!action.webhookConfig?.url) {
        throw new Error("Slack webhook URL missing");
    }

    const { url } = action.webhookConfig;

    // Build Slack message
    const slackMessage = {
        text: `New form submission: ${context.formName}`,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `📝 New Form Submission: ${context.formName}`,
                },
            },
            {
                type: "section",
                fields: Object.keys(context.submissionData).slice(0, 10).map(fieldId => ({
                    type: "mrkdwn",
                    text: `*${fieldId}:*\n${context.submissionData[fieldId]}`,
                })),
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Submission ID: ${context.submissionId} | ${new Date().toLocaleString()}`,
                    },
                ],
            },
        ],
    };

    // Send to Slack
    await axios.post(url, slackMessage, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
    });

    console.log(`✅ Slack notification sent`);
}

/**
 * Main function to execute all follow-up actions for a form submission
 */
export async function executeFollowUpActions(
    actions: IFollowUpAction[],
    context: ActionContext
): Promise<void> {
    if (!actions || actions.length === 0) {
        return;
    }

    console.log(`Executing ${actions.length} follow-up actions...`);

    for (const action of actions) {
        try {
            // Check if action should be triggered
            if (!shouldTriggerAction(action, context.submissionData)) {
                console.log(`⏭️  Skipping action ${action.id} (conditions not met)`);
                continue;
            }

            // Execute based on type
            switch (action.type) {
                case 'email':
                    await executeEmailAction(action, context);
                    break;

                case 'task':
                    await executeTaskAction(action, context);
                    break;

                case 'webhook':
                    await executeWebhookAction(action, context);
                    break;

                case 'slack':
                    await executeSlackAction(action, context);
                    break;

                default:
                    console.log(`⚠️  Unknown action type: ${action.type}`);
            }
        } catch (error: any) {
            console.error(`❌ Error executing follow-up action ${action.id}:`, error.message);
            // Don't fail the entire process if one action fails
        }
    }
}
