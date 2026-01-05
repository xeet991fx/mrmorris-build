/**
 * Lead Routing Service
 *
 * Handles automatic lead assignment based on routing rules, round-robin, and territory logic.
 * Follows HubSpot and Salesforce best practices.
 */

import { Types } from "mongoose";
import Form, { ILeadRoutingRule } from "../models/Form";
import Contact from "../models/Contact";
import getRedisClient from "../config/redis";

interface RoutingResult {
    assignedTo: string | null;
    tags: string[];
    notifyEmails: string[];
    routingReason?: string;
}

/**
 * Redis key prefix for round-robin counters
 */
const ROUND_ROBIN_KEY_PREFIX = 'lead:routing:roundrobin:';

/**
 * Evaluate a single routing condition
 */
function evaluateCondition(
    submissionData: Record<string, any>,
    condition: { fieldId: string; operator: string; value: string }
): boolean {
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
}

/**
 * Evaluate if a routing rule matches the submission data
 */
function evaluateRule(rule: ILeadRoutingRule, submissionData: Record<string, any>): boolean {
    if (!rule.enabled || !rule.conditions || rule.conditions.length === 0) {
        return false;
    }

    // All conditions must match (AND logic)
    return rule.conditions.every(condition =>
        evaluateCondition(submissionData, condition)
    );
}

/**
 * Get next user in round-robin rotation (using Redis for persistence)
 */
async function getNextRoundRobinUser(formId: string, users: string[]): Promise<string> {
    if (!users || users.length === 0) {
        throw new Error("No users available for round-robin assignment");
    }

    try {
        const redis = getRedisClient();
        const key = `${ROUND_ROBIN_KEY_PREFIX}${formId}`;

        // Atomically increment counter and get new value
        // INCR returns the new value after incrementing
        const counter = await redis.incr(key);

        // Get user at current position (counter - 1 because INCR returns post-increment value)
        const selectedUser = users[(counter - 1) % users.length];

        console.log(`🔄 Round-robin: Form ${formId} -> User ${selectedUser} (position ${counter})`);

        return selectedUser;
    } catch (error: any) {
        console.error('❌ Redis error in round-robin, falling back to first user:', error.message);
        // Fallback to first user if Redis fails
        return users[0];
    }
}

/**
 * Main lead routing function
 *
 * @param formId - Form ID that was submitted
 * @param submissionData - Form submission data (field ID -> value mapping)
 * @param contactId - Created contact ID (optional)
 * @returns Routing result with assignment, tags, and notifications
 */
export async function routeLead(
    formId: string,
    submissionData: Record<string, any>,
    contactId?: Types.ObjectId
): Promise<RoutingResult> {
    try {
        // Get form with routing configuration
        const form = await Form.findById(formId);

        if (!form || !form.leadRouting?.enabled) {
            return {
                assignedTo: null,
                tags: [],
                notifyEmails: [],
                routingReason: "Lead routing not enabled",
            };
        }

        const routing = form.leadRouting;
        let assignedTo: string | null = null;
        let tags: string[] = [];
        let notifyEmails: string[] = [];
        let routingReason = "";

        // Step 1: Check routing rules (priority-based)
        if (routing.rules && routing.rules.length > 0) {
            // Sort rules by priority (lower number = higher priority)
            const sortedRules = [...routing.rules].sort((a, b) => a.priority - b.priority);

            // Find first matching rule
            for (const rule of sortedRules) {
                if (evaluateRule(rule, submissionData)) {
                    // Execute rule action
                    if (rule.action.type === 'assign' && rule.action.assignTo) {
                        assignedTo = rule.action.assignTo;
                        routingReason = `Matched rule: ${rule.name}`;
                    }

                    if (rule.action.tags && rule.action.tags.length > 0) {
                        tags = [...tags, ...rule.action.tags];
                    }

                    if (rule.action.notifyEmails && rule.action.notifyEmails.length > 0) {
                        notifyEmails = [...notifyEmails, ...rule.action.notifyEmails];
                    }

                    // Stop at first matching rule
                    break;
                }
            }
        }

        // Step 2: If no rule matched and round-robin is enabled
        if (!assignedTo && routing.roundRobinEnabled && routing.roundRobinUsers && routing.roundRobinUsers.length > 0) {
            assignedTo = await getNextRoundRobinUser(formId, routing.roundRobinUsers);
            routingReason = "Round-robin assignment";
        }

        // Step 3: Fall back to default assignee
        if (!assignedTo && routing.defaultAssignee) {
            assignedTo = routing.defaultAssignee;
            routingReason = "Default assignee";
        }

        // Step 4: Update contact with assignment if we have a contact
        if (contactId && assignedTo) {
            await Contact.findByIdAndUpdate(contactId, {
                $set: {
                    ownerId: assignedTo,
                    tags: tags.length > 0 ? tags : undefined,
                },
            });
        }

        console.log(`✅ Lead routed: ${routingReason} -> ${assignedTo || 'unassigned'}`);

        return {
            assignedTo,
            tags,
            notifyEmails,
            routingReason,
        };
    } catch (error: any) {
        console.error("❌ Error routing lead:", error);
        return {
            assignedTo: null,
            tags: [],
            notifyEmails: [],
            routingReason: `Error: ${error.message}`,
        };
    }
}

/**
 * Reset round-robin counter for a form (useful for testing or manual resets)
 */
export async function resetRoundRobin(formId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        const key = `${ROUND_ROBIN_KEY_PREFIX}${formId}`;
        await redis.del(key);
        console.log(`🔄 Round-robin counter reset for form: ${formId}`);
    } catch (error: any) {
        console.error('❌ Redis error resetting round-robin:', error.message);
    }
}

/**
 * Get current round-robin position for a form
 */
export async function getRoundRobinPosition(formId: string): Promise<number> {
    try {
        const redis = getRedisClient();
        const key = `${ROUND_ROBIN_KEY_PREFIX}${formId}`;
        const value = await redis.get(key);
        return value ? parseInt(value, 10) : 0;
    } catch (error: any) {
        console.error('❌ Redis error getting round-robin position:', error.message);
        return 0;
    }
}
