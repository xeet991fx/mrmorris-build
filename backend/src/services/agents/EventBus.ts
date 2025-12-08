/**
 * EventBus - Pub/Sub event system for agent communication
 * Allows agents to communicate without direct dependencies
 */

import { EventEmitter } from 'events';
import { AgentEvent, AgentEventType } from './types';

type EventHandler = (event: AgentEvent) => void | Promise<void>;

interface Subscription {
    id: string;
    eventType: AgentEventType | '*';
    handler: EventHandler;
    once: boolean;
}

export class EventBus extends EventEmitter {
    private static instance: EventBus;
    private subscriptions: Map<string, Subscription> = new Map();
    private eventHistory: AgentEvent[] = [];
    private readonly maxHistorySize = 1000;

    private constructor() {
        super();
        this.setMaxListeners(100); // Allow many agent listeners
    }

    // ============================================
    // SINGLETON PATTERN
    // ============================================

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    // ============================================
    // PUBLISH EVENTS
    // ============================================

    /**
     * Publish an event to all subscribers
     */
    publish(event: Omit<AgentEvent, 'id' | 'timestamp'>): void {
        const fullEvent: AgentEvent = {
            ...event,
            id: this.generateEventId(),
            timestamp: new Date(),
        };

        // Store in history
        this.addToHistory(fullEvent);

        // Emit to all listeners
        this.emit(event.type, fullEvent);
        this.emit('*', fullEvent); // Wildcard listeners

        console.log(`[EventBus] Published: ${event.type}`, {
            source: event.source,
            workspaceId: event.workspaceId,
        });
    }

    /**
     * Publish with async handler completion tracking
     */
    async publishAsync(event: Omit<AgentEvent, 'id' | 'timestamp'>): Promise<void> {
        const fullEvent: AgentEvent = {
            ...event,
            id: this.generateEventId(),
            timestamp: new Date(),
        };

        this.addToHistory(fullEvent);

        const handlers = this.getHandlersForEvent(fullEvent.type);
        await Promise.all(
            handlers.map(async (sub) => {
                try {
                    await sub.handler(fullEvent);
                    if (sub.once) {
                        this.unsubscribe(sub.id);
                    }
                } catch (error) {
                    console.error(`[EventBus] Handler error for ${event.type}:`, error);
                }
            })
        );
    }

    // ============================================
    // SUBSCRIBE TO EVENTS
    // ============================================

    /**
     * Subscribe to an event type
     */
    subscribe(
        eventType: AgentEventType | '*',
        handler: EventHandler
    ): string {
        const subscriptionId = this.generateSubscriptionId();

        const subscription: Subscription = {
            id: subscriptionId,
            eventType,
            handler,
            once: false,
        };

        this.subscriptions.set(subscriptionId, subscription);
        this.on(eventType, handler);

        console.log(`[EventBus] Subscribed: ${subscriptionId} -> ${eventType}`);
        return subscriptionId;
    }

    /**
     * Subscribe to an event type, auto-unsubscribe after first event
     */
    subscribeOnce(
        eventType: AgentEventType | '*',
        handler: EventHandler
    ): string {
        const subscriptionId = this.generateSubscriptionId();

        const subscription: Subscription = {
            id: subscriptionId,
            eventType,
            handler,
            once: true,
        };

        this.subscriptions.set(subscriptionId, subscription);
        this.once(eventType, handler);

        return subscriptionId;
    }

    /**
     * Unsubscribe from an event
     */
    unsubscribe(subscriptionId: string): boolean {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) return false;

        this.off(subscription.eventType, subscription.handler);
        this.subscriptions.delete(subscriptionId);

        console.log(`[EventBus] Unsubscribed: ${subscriptionId}`);
        return true;
    }

    /**
     * Unsubscribe all handlers for an event type
     */
    unsubscribeAll(eventType?: AgentEventType): void {
        if (eventType) {
            this.removeAllListeners(eventType);
            for (const [id, sub] of this.subscriptions) {
                if (sub.eventType === eventType) {
                    this.subscriptions.delete(id);
                }
            }
        } else {
            this.removeAllListeners();
            this.subscriptions.clear();
        }
    }

    // ============================================
    // QUERY EVENTS
    // ============================================

    /**
     * Get recent events, optionally filtered by type
     */
    getRecentEvents(options?: {
        type?: AgentEventType;
        workspaceId?: string;
        limit?: number;
    }): AgentEvent[] {
        let events = [...this.eventHistory];

        if (options?.type) {
            events = events.filter(e => e.type === options.type);
        }

        if (options?.workspaceId) {
            events = events.filter(e => e.workspaceId === options.workspaceId);
        }

        const limit = options?.limit || 50;
        return events.slice(-limit);
    }

    /**
     * Wait for a specific event
     */
    waitForEvent(
        eventType: AgentEventType,
        timeoutMs: number = 30000,
        filter?: (event: AgentEvent) => boolean
    ): Promise<AgentEvent> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(eventType, handler);
                reject(new Error(`Timeout waiting for event: ${eventType}`));
            }, timeoutMs);

            const handler = (event: AgentEvent) => {
                if (!filter || filter(event)) {
                    clearTimeout(timeoutId);
                    this.off(eventType, handler);
                    resolve(event);
                }
            };

            this.on(eventType, handler);
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    private generateEventId(): string {
        return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateSubscriptionId(): string {
        return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private addToHistory(event: AgentEvent): void {
        this.eventHistory.push(event);

        // Trim history if too large
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    private getHandlersForEvent(eventType: AgentEventType): Subscription[] {
        const handlers: Subscription[] = [];
        for (const sub of this.subscriptions.values()) {
            if (sub.eventType === eventType || sub.eventType === '*') {
                handlers.push(sub);
            }
        }
        return handlers;
    }

    /**
     * Get subscription count
     */
    getSubscriptionCount(): number {
        return this.subscriptions.size;
    }

    /**
     * Clear event history
     */
    clearHistory(): void {
        this.eventHistory = [];
    }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
export default eventBus;
