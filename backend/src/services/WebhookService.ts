import WebhookSubscription from "../models/WebhookSubscription";
import crypto from "crypto";

interface WebhookPayload {
    event: string;
    workspaceId: string;
    timestamp: string;
    data: any;
}

export class WebhookService {
    // Retry configuration
    private readonly MAX_RETRIES = 5; // Increased from 3 to 5
    private readonly BASE_DELAY_MS = 1000; // 1 second base delay
    private readonly MAX_DELAY_MS = 60000; // 1 minute max delay
    private readonly JITTER_FACTOR = 0.3; // 30% jitter

    /**
     * Calculate exponential backoff delay with jitter
     * Formula: min(max_delay, base_delay * 2^attempt) + random_jitter
     */
    private calculateBackoffDelay(attempt: number): number {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const exponentialDelay = this.BASE_DELAY_MS * Math.pow(2, attempt);

        // Cap at maximum delay
        const cappedDelay = Math.min(exponentialDelay, this.MAX_DELAY_MS);

        // Add jitter to prevent thundering herd
        const jitter = cappedDelay * this.JITTER_FACTOR * (Math.random() - 0.5);
        const finalDelay = cappedDelay + jitter;

        return Math.max(0, Math.floor(finalDelay));
    }

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
     * Send individual webhook with exponential backoff retry
     */
    private async sendWebhook(
        subscription: any,
        event: string,
        workspaceId: string,
        data: any
    ): Promise<void> {
        let attempt = 0;

        while (attempt < this.MAX_RETRIES) {
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
                const errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message;

                console.error(
                    `❌ Webhook delivery failed (attempt ${attempt}/${this.MAX_RETRIES}):`,
                    errorMessage
                );

                if (attempt >= this.MAX_RETRIES) {
                    // Max retries reached - update error
                    await WebhookSubscription.findByIdAndUpdate(subscription._id, {
                        lastError: errorMessage,
                        retryCount: subscription.retryCount + 1,
                    });

                    // Disable webhook if it fails too many times (after 10 delivery attempts)
                    if (subscription.retryCount >= 10) {
                        await WebhookSubscription.findByIdAndUpdate(subscription._id, {
                            isActive: false,
                            lastError: `Disabled after ${subscription.retryCount} failed attempts`,
                        });
                        console.log(`⚠️ Webhook disabled due to repeated failures: ${subscription.url}`);
                    }
                } else {
                    // Calculate exponential backoff delay with jitter
                    const delayMs = this.calculateBackoffDelay(attempt);
                    console.log(`⏳ Retrying in ${(delayMs / 1000).toFixed(2)}s...`);

                    // Wait before retry
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }
    }
}

export const webhookService = new WebhookService();
