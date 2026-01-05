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

        // Retry configuration
        const MAX_RETRIES = 3;
        const BASE_DELAY = 1000; // 1 second
        let lastError: any = null;

        // Attempt webhook with exponential backoff retry
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Make the HTTP request with 10 second timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                this.log(`🌐 Sending ${webhookMethod} request to ${url} (attempt ${attempt}/${MAX_RETRIES})`);

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

                // Retry on server errors (5xx) or specific client errors
                if (response.status >= 500 || response.status === 429 || response.status === 408) {
                    lastError = new Error(`HTTP ${responseStatus}: ${responseStatusText}`);
                    this.log(`⚠️ Retriable error: ${responseStatus} ${responseStatusText}`);

                    // Don't retry if this was the last attempt
                    if (attempt === MAX_RETRIES) {
                        return this.error(`Webhook failed after ${MAX_RETRIES} attempts: ${responseStatus} ${responseStatusText}`);
                    }

                    // Exponential backoff: 1s, 2s, 4s
                    const delay = BASE_DELAY * Math.pow(2, attempt - 1);
                    this.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                if (!response.ok) {
                    this.log(`⚠️ Webhook returned non-2xx status: ${responseStatus} ${responseStatusText}`);
                    // Non-retriable client error (4xx except 429, 408) - fail immediately
                    if (response.status >= 400 && response.status < 500) {
                        return this.error(`Webhook failed: ${responseStatus} ${responseStatusText}`);
                    }
                }

                this.log(`✅ Webhook delivered: ${responseStatus} ${responseStatusText} (attempt ${attempt})`);

                return this.success({
                    delivered: true,
                    url,
                    method: webhookMethod,
                    status: responseStatus,
                    statusText: responseStatusText,
                    attempts: attempt,
                    response: typeof responseData === "string"
                        ? responseData.substring(0, 500)
                        : responseData,
                });
            } catch (error: any) {
                lastError = error;

                if (error.name === "AbortError") {
                    this.log(`❌ Webhook timed out after 10 seconds (attempt ${attempt}/${MAX_RETRIES})`);
                } else {
                    this.log(`❌ Webhook failed: ${error.message} (attempt ${attempt}/${MAX_RETRIES})`);
                }

                // Don't retry if this was the last attempt
                if (attempt === MAX_RETRIES) {
                    if (error.name === "AbortError") {
                        return this.error(`Webhook timed out after ${MAX_RETRIES} attempts (10 second limit)`);
                    }
                    return this.error(`Webhook failed after ${MAX_RETRIES} attempts: ${error.message}`);
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = BASE_DELAY * Math.pow(2, attempt - 1);
                this.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Should never reach here, but just in case
        return this.error(`Webhook failed: ${lastError?.message || 'Unknown error'}`);
    }
}

export default new WebhookActionExecutor();
