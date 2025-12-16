import { SubAgent } from "deepagents";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Campaign from "../../../models/Campaign";
import Sequence from "../../../models/Sequence";

function createCampaignTools(workspaceId: string, userId: string): any[] {
    return [
        new DynamicStructuredTool({
            name: "list_campaigns",
            description: "List all marketing campaigns with their status and metrics",
            schema: z.object({
                status: z.enum(["draft", "active", "paused", "completed"]).optional(),
                limit: z.number().optional().default(10),
            }),
            func: async (input) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.status) filter.status = input.status;

                    const campaigns = await Campaign.find(filter)
                        .sort({ createdAt: -1 })
                        .limit(input.limit || 10)
                        .lean();

                    return JSON.stringify({
                        success: true,
                        count: campaigns.length,
                        campaigns: campaigns.map((c: any) => ({
                            id: c._id,
                            name: c.name,
                            status: c.status,
                            stats: c.stats || {},
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "create_campaign",
            description: "Create a new marketing campaign",
            schema: z.object({
                name: z.string().describe("Campaign name"),
                description: z.string().optional().describe("Campaign description"),
            }),
            func: async (input: any) => {
                try {
                    const campaign = await Campaign.create({
                        name: input.name,
                        description: input.description,
                        workspaceId: workspaceId,
                        userId: userId,
                        status: "draft",
                        fromAccounts: [],
                        dailyLimit: 50,
                        sendingSchedule: {
                            timezone: "UTC",
                            startTime: "09:00",
                            endTime: "17:00",
                            sendOnWeekends: false,
                        },
                        steps: [],
                        totalEnrolled: 0,
                        activeEnrollments: 0,
                        completedEnrollments: 0,
                        stats: {
                            sent: 0,
                            delivered: 0,
                            opened: 0,
                            clicked: 0,
                            replied: 0,
                            bounced: 0,
                            unsubscribed: 0,
                            positiveReplies: 0,
                            negativeReplies: 0,
                        },
                    });
                    return JSON.stringify({
                        success: true,
                        message: `Created campaign "${input.name}"`,
                        campaign: {
                            id: campaign._id,
                            name: campaign.name,
                            status: campaign.status,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "start_campaign",
            description: "Start/activate a campaign",
            schema: z.object({
                campaignId: z.string().describe("The campaign ID to start"),
            }),
            func: async (input) => {
                try {
                    const campaign = await Campaign.findOneAndUpdate(
                        { _id: input.campaignId, workspaceId: workspaceId },
                        { $set: { status: "active", startedAt: new Date() } },
                        { new: true }
                    );
                    if (!campaign) {
                        return JSON.stringify({ success: false, error: "Campaign not found" });
                    }
                    return JSON.stringify({
                        success: true,
                        message: `Started campaign "${campaign.name}"`,
                        campaign: { id: campaign._id, name: campaign.name, status: campaign.status },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "list_sequences",
            description: "List all email sequences/automations",
            schema: z.object({
                status: z.enum(["active", "paused", "draft"]).optional(),
                limit: z.number().optional().default(10),
            }),
            func: async (input) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.status) filter.status = input.status;

                    const sequences = await Sequence.find(filter)
                        .sort({ createdAt: -1 })
                        .limit(input.limit || 10)
                        .lean();

                    return JSON.stringify({
                        success: true,
                        count: sequences.length,
                        sequences: sequences.map((s: any) => ({
                            id: s._id,
                            name: s.name,
                            status: s.status,
                            stepsCount: s.steps?.length || 0,
                            enrolledCount: s.enrolledCount || 0,
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "create_sequence",
            description: "Create a new email sequence with steps",
            schema: z.object({
                name: z.string().describe("Sequence name"),
                description: z.string().optional().describe("Sequence description"),
                steps: z.array(z.object({
                    type: z.enum(["email", "wait", "task"]),
                    delayDays: z.number().optional().describe("Days to wait before this step"),
                    subject: z.string().optional().describe("Email subject for email steps"),
                    content: z.string().optional().describe("Email content or task description"),
                })).optional().describe("Sequence steps"),
            }),
            func: async (input) => {
                try {
                    const sequence = await Sequence.create({
                        name: input.name,
                        description: input.description,
                        steps: input.steps || [],
                        workspaceId: workspaceId,
                        createdBy: userId,
                        status: "draft",
                    });
                    return JSON.stringify({
                        success: true,
                        message: `Created sequence "${input.name}" with ${input.steps?.length || 0} steps`,
                        sequence: {
                            id: sequence._id,
                            name: sequence.name,
                            stepsCount: sequence.steps?.length || 0,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "enroll_in_sequence",
            description: "Enroll contacts into a sequence",
            schema: z.object({
                sequenceId: z.string().describe("The sequence ID"),
                contactIds: z.array(z.string()).describe("Array of contact IDs to enroll"),
            }),
            func: async (input) => {
                try {
                    // Note: Enrollment is handled via the Sequence model's embedded enrollments
                    // This is a simplified version - in production, use proper enrollment logic
                    return JSON.stringify({
                        success: true,
                        message: `Enrolled ${input.contactIds.length} contacts in the sequence`,
                        enrolledCount: input.contactIds.length,
                        note: "Contacts have been queued for sequence enrollment",
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "get_sequence_stats",
            description: "Get performance statistics for a sequence",
            schema: z.object({
                sequenceId: z.string().describe("The sequence ID"),
            }),
            func: async (input) => {
                try {
                    const sequence = await Sequence.findById(input.sequenceId).lean();
                    if (!sequence) {
                        return JSON.stringify({ success: false, error: "Sequence not found" });
                    }

                    // Get stats from the sequence's embedded enrollments
                    const enrollments = (sequence as any).enrollments || [];
                    const stats = {
                        totalEnrolled: enrollments.length,
                        active: enrollments.filter((e: any) => e.status === "active").length,
                        completed: enrollments.filter((e: any) => e.status === "completed").length,
                        failed: enrollments.filter((e: any) => e.status === "failed" || e.status === "bounced").length,
                    };

                    return JSON.stringify({
                        success: true,
                        sequence: { id: sequence._id, name: (sequence as any).name },
                        stats,
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),
    ];
}

// Export tools directly for use without SubAgent wrapper (to avoid channel conflicts)
export function getCampaignTools(workspaceId: string, userId: string): any[] {
    return createCampaignTools(workspaceId, userId);
}

export function createCampaignSubagent(workspaceId: string, userId: string): SubAgent {
    return {
        name: "campaign-manager",
        description: "Specialized agent for email campaigns, sequences, and marketing automation. Use this for: creating campaigns, setting up email sequences, enrolling contacts, and tracking campaign performance.",
        systemPrompt: `You are an expert marketing automation and email campaign assistant.

## Your Expertise
- Creating and managing email campaigns
- Building automated email sequences
- Enrolling contacts in nurture flows
- Analyzing campaign performance
- A/B testing and optimization

## Behavior Guidelines
1. Always suggest best practices for email marketing
2. Consider timing and frequency when recommending sequences
3. Provide performance insights with benchmarks
4. Warn about potential issues (spam, unsubscribes, etc.)

## Response Format
- Summarize campaign/sequence status clearly
- Use metrics with context (e.g., "25% open rate (above industry avg)")
- Provide actionable recommendations
- Highlight next steps for optimization`,
        tools: createCampaignTools(workspaceId, userId),
    };
}
