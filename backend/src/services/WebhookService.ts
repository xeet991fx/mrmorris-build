import WebhookSubscription from "../models/WebhookSubscription";
import crypto from "crypto";

interface WebhookPayload {
    event: string;
    workspaceId: string;
    timestamp: string;
    data: any;
}

export class WebhookService {
    /**
     * Trigger webhooks for a specific event
     */
    async trigger(workspaceId: string, event: string, data: any): Promise<void> {
        try {
            // Find all active subscriptions for this event
            const subscriptions = await WebhookSubscription.find({
                workspaceId,
                events: event,
                isActive: true,
            });

            if (subscriptions.length === 0) {
                console.log(`📡 No webhooks subscribed to ${event}`);
                return;
            }

            console.log(`📡 Triggering ${subscriptions.length} webhook(s) for ${event}`);

            // Send webhooks in parallel
            const promises = subscriptions.map((sub) =>
                this.sendWebhook(sub, event, workspaceId, data)
            );

            await Promise.allSettled(promises);
        } catch (error) {
            console.error("Webhook trigger error:", error);
        }
    }

    /**
     * Send individual webhook
     */
    private async sendWebhook(
        subscription: any,
        event: string,
        workspaceId: string,
        data: any
    ): Promise<void> {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const payload: WebhookPayload = {
                    event,
                    workspaceId,
                    timestamp: new Date().toISOString(),
                    data,
                };

                // Generate signature for verification
                const signature = crypto
                    .createHmac("sha256", subscription.secret || "")
                    .update(JSON.stringify(payload))
                    .digest("hex");

                // Build headers
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    "X-MrMorris-Signature": signature,
                    "X-MrMorris-Event": event,
                    "X-MrMorris-Delivery-ID": crypto.randomUUID(),
                };

                // Add custom headers from subscription
                if (subscription.headers) {
                    Object.entries(subscription.headers.toObject?.() || subscription.headers).forEach(
                        ([key, value]) => {
                            headers[key] = value as string;
                        }
                    );
                }

                // Send webhook with 10 second timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(subscription.url, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Update success
                await WebhookSubscription.findByIdAndUpdate(subscription._id, {
                    lastTriggeredAt: new Date(),
                    lastError: null,
                    retryCount: 0,
                });

                console.log(`✅ Webhook delivered: ${event} to ${subscription.url}`);
                return; // Success - exit retry loop
            } catch (error: any) {
                attempt++;
                console.error(
                    `❌ Webhook delivery failed (attempt ${attempt}/${maxRetries}):`,
                    error.message
                );

                if (attempt >= maxRetries) {
                    // Max retries reached - update error
                    await WebhookSubscription.findByIdAndUpdate(subscription._id, {
                        lastError: error.message,
                        retryCount: subscription.retryCount + 1,
                    });

                    // Disable webhook if it fails too many times
                    if (subscription.retryCount >= 10) {
                        await WebhookSubscription.findByIdAndUpdate(subscription._id, {
                            isActive: false,
                            lastError: `Disabled after ${subscription.retryCount} failed attempts`,
                        });
                        console.log(`⚠️ Webhook disabled: ${subscription.url}`);
                    }
                } else {
                    // Wait before retry (exponential backoff)
                    await new Promise((resolve) =>
                        setTimeout(resolve, Math.pow(2, attempt) * 1000)
                    );
                }
            }
        }
    }
}

export const webhookService = new WebhookService();
