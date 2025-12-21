/**
 * Context Analyzer Service
 * 
 * Monitors user actions, builds context payloads, and determines when to trigger AI agents.
 * This is Layer 1 of the three-layer AI architecture.
 */

import { Types } from "mongoose";
import UserAction, { IUserAction } from "../models/UserAction";
import Contact from "../models/Contact";
import Opportunity from "../models/Opportunity";
import Campaign from "../models/Campaign";
import EmailMessage from "../models/EmailMessage";
import Activity from "../models/Activity";

// Context types for different pages
export interface BaseContext {
    userId: string;
    workspaceId: string;
    action: string;
    page: string;
    timestamp: Date;
}

export interface ContactContext extends BaseContext {
    contactId: string;
    contactData: {
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        tags?: string[];
        status?: string;
    };
    engagementHistory: {
        emailsSent: number;
        emailsOpened: number;
        emailsClicked: number;
        lastEmailDate?: Date;
        lastOpenDate?: Date;
    };
    dealHistory: {
        currentDeals: any[];
        wonDeals: any[];
        lostDeals: any[];
        totalValue: number;
    };
    recentActivity: any[];
}

export interface DealContext extends BaseContext {
    dealId: string;
    dealData: {
        name: string;
        value: number;
        stage: string;
        pipelineId: string;
        createdDate: Date;
        lastActivityDate?: Date;
        daysInStage: number;
        expectedCloseDate?: Date;
        assignedTo?: string;
    };
    contactEngagement: number;
    historicalData: {
        similarDeals: any[];
        winRate: number;
        averageTimeInStage: Record<string, number>;
    };
}

export interface CampaignContext extends BaseContext {
    campaignId: string;
    campaignData: {
        name: string;
        type: string;
        status: string;
        audienceSize: number;
        content?: {
            subject?: string;
            body?: string;
        };
        schedule?: {
            sendTime?: Date;
        };
    };
    performance?: {
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        replied: number;
        unsubscribed: number;
    };
}

export interface EmailContext extends BaseContext {
    emailId: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    threadHistory?: any[];
    contactData?: any;
    relatedDeals?: any[];
}

export interface WorkflowContext extends BaseContext {
    userActions: IUserAction[];
    repetitivePatterns: {
        action: string;
        frequency: number;
        avgTimeTaken: number;
    }[];
    existingWorkflows: any[];
}

// Trigger rules for when to invoke agents
const TRIGGER_RULES: Record<string, Record<string, boolean>> = {
    contact_detail: {
        view: true,
        edit: false,
        create: true,
    },
    pipeline: {
        view: true,
        stage_change: true,
        create: true,
    },
    campaign: {
        create: true,
        schedule: true,
        view_performance: true,
    },
    inbox: {
        new_email: true,
        open_email: false,
        reply: true,
    },
    workflow: {
        view: true,
        create: true,
    },
};

class ContextAnalyzer {
    /**
     * Track user action
     */
    async trackAction(
        workspaceId: string,
        userId: string,
        actionType: string,
        page: string,
        resourceType?: string,
        resourceId?: string,
        metadata?: Record<string, any>
    ): Promise<IUserAction> {
        const action = await UserAction.create({
            workspaceId: new Types.ObjectId(workspaceId),
            userId: new Types.ObjectId(userId),
            actionType,
            page,
            resourceType,
            resourceId: resourceId ? new Types.ObjectId(resourceId) : undefined,
            metadata,
            timestamp: new Date(),
        });

        return action;
    }

    /**
     * Determine if action warrants agent analysis
     */
    shouldTriggerAgent(page: string, action: string): boolean {
        return TRIGGER_RULES[page]?.[action] ?? false;
    }

    /**
     * Calculate priority for agent queue
     */
    calculatePriority(context: BaseContext, additionalData?: any): number {
        let priority = 50;

        // High priority for new emails
        if (context.page === 'inbox' && context.action === 'new_email') {
            priority = 90;
        }

        // High value deals
        if (context.page === 'pipeline' && additionalData?.dealValue > 100000) {
            priority = 80;
        }

        // Cold contacts (no activity in 14 days)
        if (context.page === 'contact_detail' && additionalData?.daysSinceActivity > 14) {
            priority = 70;
        }

        return priority;
    }

    /**
     * Build contact context for agent analysis
     */
    async buildContactContext(
        workspaceId: string,
        userId: string,
        contactId: string,
        action: string
    ): Promise<ContactContext> {
        // First get the contact to access email
        const contact = await Contact.findById(contactId);

        // Then get related data using contact email
        const [deals, activities, emails] = await Promise.all([
            Opportunity.find({
                workspaceId: new Types.ObjectId(workspaceId),
                contactIds: new Types.ObjectId(contactId)
            }),
            Activity.find({
                contactId: new Types.ObjectId(contactId)
            }).sort({ createdAt: -1 }).limit(20),
            contact?.email ? EmailMessage.find({
                workspaceId: new Types.ObjectId(workspaceId),
                $or: [
                    { toEmail: contact.email },
                    { fromEmail: contact.email }
                ]
            }).sort({ sentAt: -1 }).limit(50) : Promise.resolve([]),
        ]);

        const wonDeals = deals.filter(d => d.status === 'won');
        const lostDeals = deals.filter(d => d.status === 'lost');
        const currentDeals = deals.filter(d => d.status === 'open');

        // Use type assertion for flexible field access
        const emailsSent = emails.length;
        const emailsOpened = emails.filter(e => (e as any).opened).length;
        const emailsClicked = emails.filter(e => (e as any).clicked).length;

        return {
            userId,
            workspaceId,
            action,
            page: 'contact_detail',
            timestamp: new Date(),
            contactId,
            contactData: {
                name: `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim(),
                email: contact?.email,
                phone: contact?.phone,
                company: contact?.company,
                tags: contact?.tags || [],
                status: contact?.status,
            },
            engagementHistory: {
                emailsSent,
                emailsOpened,
                emailsClicked,
                lastEmailDate: emails[0]?.sentAt,
                lastOpenDate: emails.find(e => (e as any).opened)?.openedAt,
            },
            dealHistory: {
                currentDeals,
                wonDeals,
                lostDeals,
                totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
            },
            recentActivity: activities,
        };
    }

    /**
     * Build deal context for agent analysis
     */
    async buildDealContext(
        workspaceId: string,
        userId: string,
        dealId: string,
        action: string
    ): Promise<DealContext> {
        const deal = await Opportunity.findById(dealId);

        if (!deal) {
            throw new Error(`Deal not found: ${dealId}`);
        }

        const stageStartDate = deal.stageHistory?.slice(-1)[0]?.enteredAt || deal.createdAt;
        const daysInStage = Math.floor(
            (Date.now() - new Date(stageStartDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get similar deals for comparison
        const similarDeals = await Opportunity.find({
            workspaceId: new Types.ObjectId(workspaceId),
            pipelineId: deal.pipelineId,
            _id: { $ne: dealId },
        }).limit(50);

        const wonDeals = similarDeals.filter(d => d.status === 'won');
        const winRate = similarDeals.length > 0
            ? (wonDeals.length / similarDeals.length) * 100
            : 50;

        return {
            userId,
            workspaceId,
            action,
            page: 'pipeline',
            timestamp: new Date(),
            dealId,
            dealData: {
                name: deal.title,
                value: deal.value || 0,
                stage: deal.stageId?.toString() || '',
                pipelineId: deal.pipelineId?.toString() || '',
                createdDate: deal.createdAt,
                lastActivityDate: deal.lastActivityAt,
                daysInStage,
                expectedCloseDate: deal.expectedCloseDate,
                assignedTo: deal.assignedTo?.toString(),
            },
            contactEngagement: 50, // TODO: Calculate from contact data
            historicalData: {
                similarDeals,
                winRate,
                averageTimeInStage: {}, // TODO: Calculate from historical data
            },
        };
    }

    /**
     * Build campaign context for agent analysis
     */
    async buildCampaignContext(
        workspaceId: string,
        userId: string,
        campaignId: string,
        action: string
    ): Promise<CampaignContext> {
        const campaign = await Campaign.findById(campaignId);

        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }

        return {
            userId,
            workspaceId,
            action,
            page: 'campaign',
            timestamp: new Date(),
            campaignId,
            campaignData: {
                name: campaign.name,
                type: (campaign as any).type || 'email',
                status: campaign.status,
                audienceSize: 0, // TODO: Calculate from recipients
                content: {
                    subject: (campaign as any).content?.subject || (campaign as any).subject,
                    body: (campaign as any).content?.body || (campaign as any).body,
                },
                schedule: {
                    sendTime: (campaign as any).schedule?.startDate || campaign.createdAt,
                },
            },
            performance: (campaign as any).metrics ? {
                sent: (campaign as any).metrics.sent || 0,
                delivered: (campaign as any).metrics.delivered || 0,
                opened: (campaign as any).metrics.opened || 0,
                clicked: (campaign as any).metrics.clicked || 0,
                replied: (campaign as any).metrics.replied || 0,
                unsubscribed: (campaign as any).metrics.unsubscribed || 0,
            } : undefined,
        };
    }

    /**
     * Build email context for agent analysis
     */
    async buildEmailContext(
        workspaceId: string,
        userId: string,
        emailId: string,
        action: string
    ): Promise<EmailContext> {
        const email = await EmailMessage.findById(emailId);

        if (!email) {
            throw new Error(`Email not found: ${emailId}`);
        }

        // Get thread history
        const threadHistory = email.threadId
            ? await EmailMessage.find({ threadId: email.threadId }).sort({ date: 1 })
            : [];

        // Get contact data if sender is known
        const senderEmail = email.fromEmail;
        const contact = await Contact.findOne({
            workspaceId: new Types.ObjectId(workspaceId),
            email: senderEmail,
        });

        // Get related deals
        const relatedDeals = contact
            ? await Opportunity.find({
                workspaceId: new Types.ObjectId(workspaceId),
                contactIds: contact._id,
            })
            : [];

        return {
            userId,
            workspaceId,
            action,
            page: 'inbox',
            timestamp: new Date(),
            emailId,
            from: email.fromEmail,
            to: email.toEmail || '',
            subject: email.subject,
            body: email.bodyHtml || email.bodyText || '',
            threadHistory,
            contactData: contact,
            relatedDeals,
        };
    }

    /**
     * Build workflow context for automation suggestions
     */
    async buildWorkflowContext(
        workspaceId: string,
        userId: string
    ): Promise<WorkflowContext> {
        // Get user actions from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const userActions = await UserAction.find({
            workspaceId: new Types.ObjectId(workspaceId),
            userId: new Types.ObjectId(userId),
            timestamp: { $gte: thirtyDaysAgo },
        }).sort({ timestamp: -1 });

        // Detect repetitive patterns
        const actionCounts: Record<string, number> = {};
        userActions.forEach(action => {
            const key = `${action.actionType}_${action.resourceType || 'general'}`;
            actionCounts[key] = (actionCounts[key] || 0) + 1;
        });

        const repetitivePatterns = Object.entries(actionCounts)
            .filter(([_, count]) => count >= 5)
            .map(([action, frequency]) => ({
                action,
                frequency,
                avgTimeTaken: 30000, // Default 30 seconds TODO: Calculate actual
            }));

        // Get existing workflows
        const Workflow = require('../models/Workflow').default;
        const existingWorkflows = await Workflow.find({
            workspaceId: new Types.ObjectId(workspaceId),
        });

        return {
            userId,
            workspaceId,
            action: 'view',
            page: 'workflow',
            timestamp: new Date(),
            userActions,
            repetitivePatterns,
            existingWorkflows,
        };
    }
}

export const contextAnalyzer = new ContextAnalyzer();
export default contextAnalyzer;
