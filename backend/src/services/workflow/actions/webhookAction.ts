/**
 * Webhook Action Executor
 * 
 * Sends HTTP requests to external services as part of workflow automation.
 */

import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";

interface WebhookConfig {
    webhookUrl: string;
    webhookMethod: "GET" | "POST" | "PUT" | "PATCH";
    webhookHeaders?: Record<string, string>;
    webhookBody?: string;
}

export class WebhookActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as WebhookConfig;

        const { webhookUrl, webhookMethod, webhookHeaders, webhookBody } = config;

        if (!webhookUrl) {
            return this.error("Webhook URL is required");
        }

        // Replace placeholders in URL
        const url = replacePlaceholders(webhookUrl, entity);

        // Build headers
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "MrMorris-CRM-Workflow/1.0",
            ...webhookHeaders,
        };

        // Replace placeholders in headers
        for (const key in headers) {
            headers[key] = replacePlaceholders(headers[key], entity);
        }

        // Build body with placeholders
        let body: string | undefined;
        if (webhookBody && webhookMethod !== "GET") {
            body = replacePlaceholders(webhookBody, entity);
        } else if (webhookMethod !== "GET") {
            // Default body with entity data
            body = JSON.stringify({
                event: "workflow_action",
                workflowId: enrollment.workflowId.toString(),
                enrollmentId: (enrollment as any)._id?.toString(),
                entityType: enrollment.entityType,
                entity: {
                    id: entity._id?.toString(),
                    firstName: entity.firstName,
                    lastName: entity.lastName,
                    email: entity.email,
                    phone: entity.phone,
                    company: entity.company,
                    status: entity.status,
                },
                timestamp: new Date().toISOString(),
            });
        }

        try {
            // Make the HTTP request with 10 second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            this.log(`🌐 Sending ${webhookMethod} request to ${url}`);

            const response = await fetch(url, {
                method: webhookMethod,
                headers,
                body: body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const responseStatus = response.status;
            const responseStatusText = response.statusText;
            let responseData: any;

            try {
                responseData = await response.json();
            } catch {
                responseData = await response.text();
            }

            if (!response.ok) {
                this.log(`⚠️ Webhook returned non-2xx status: ${responseStatus} ${responseStatusText}`);
                // Still count as success if it was delivered, but log the issue
            }

            this.log(`✅ Webhook delivered: ${responseStatus} ${responseStatusText}`);

            return this.success({
                delivered: true,
                url,
                method: webhookMethod,
                status: responseStatus,
                statusText: responseStatusText,
                response: typeof responseData === "string"
                    ? responseData.substring(0, 500)
                    : responseData,
            });
        } catch (error: any) {
            if (error.name === "AbortError") {
                this.log(`❌ Webhook timed out after 10 seconds`);
                return this.error("Webhook request timed out (10 second limit)");
            }

            this.log(`❌ Webhook failed: ${error.message}`);
            return this.error(`Webhook failed: ${error.message}`);
        }
    }
}

export default new WebhookActionExecutor();
