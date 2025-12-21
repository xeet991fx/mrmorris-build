import Activity from '../models/Activity';
import { Types } from 'mongoose';

interface ActivityContext {
    workspaceId: string | Types.ObjectId;
    userId?: string | Types.ObjectId;
    automated?: boolean;
}

/**
 * Activity Service - Centralizes activity logging across the application
 */
export const ActivityService = {
    /**
     * Log company created
     */
    async logCompanyCreated(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        companyName: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'note',
            title: `Company "${companyName}" created`,
            description: 'New company was added to the CRM',
            automated: ctx.automated ?? true,
            isAutoLogged: true,
        });
    },

    /**
     * Log company status changed
     */
    async logCompanyStatusChanged(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        companyName: string,
        oldStatus: string | undefined,
        newStatus: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'stage_change',
            title: `Status changed to "${newStatus}"`,
            description: oldStatus
                ? `Company status changed from "${oldStatus}" to "${newStatus}"`
                : `Company status set to "${newStatus}"`,
            automated: ctx.automated ?? false,
            isAutoLogged: true,
            metadata: {
                fromStage: oldStatus,
                toStage: newStatus,
                companyName,
            },
        });
    },

    /**
     * Log contact linked to company
     */
    async logContactLinkedToCompany(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        companyName: string,
        contactId: string | Types.ObjectId,
        contactName: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'note',
            title: `Contact "${contactName}" linked`,
            description: `${contactName} was linked to ${companyName}`,
            automated: ctx.automated ?? true,
            isAutoLogged: true,
            metadata: {
                contactId: contactId.toString(),
                contactName,
                companyName,
            },
        });
    },

    /**
     * Log contact unlinked from company
     */
    async logContactUnlinkedFromCompany(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        companyName: string,
        contactName: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'note',
            title: `Contact "${contactName}" unlinked`,
            description: `${contactName} was unlinked from ${companyName}`,
            automated: ctx.automated ?? true,
            isAutoLogged: true,
            metadata: {
                contactName,
                companyName,
            },
        });
    },

    /**
     * Log deal/opportunity created for company
     */
    async logDealCreatedForCompany(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        dealId: string | Types.ObjectId,
        dealName: string,
        dealValue?: number
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'note',
            title: `New deal "${dealName}" created`,
            description: dealValue
                ? `Deal worth $${dealValue.toLocaleString()} was created`
                : 'New deal was created',
            automated: ctx.automated ?? true,
            isAutoLogged: true,
            metadata: {
                dealId: dealId.toString(),
                dealName,
                dealValue,
            },
        });
    },

    /**
     * Log deal stage changed
     */
    async logDealStageChanged(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        dealId: string | Types.ObjectId,
        dealName: string,
        oldStage: string | undefined,
        newStage: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            opportunityId: dealId,
            type: 'stage_change',
            title: `Deal "${dealName}" moved to "${newStage}"`,
            description: oldStage
                ? `Deal stage changed from "${oldStage}" to "${newStage}"`
                : `Deal stage set to "${newStage}"`,
            automated: ctx.automated ?? false,
            isAutoLogged: true,
            metadata: {
                dealId: dealId.toString(),
                dealName,
                fromStage: oldStage,
                toStage: newStage,
            },
        });
    },

    /**
     * Log deal won
     */
    async logDealWon(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        dealId: string | Types.ObjectId,
        dealName: string,
        dealValue?: number
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            opportunityId: dealId,
            type: 'stage_change',
            title: `🎉 Deal "${dealName}" won!`,
            description: dealValue
                ? `Deal worth $${dealValue.toLocaleString()} was closed and won!`
                : 'Deal was closed and won!',
            automated: ctx.automated ?? true,
            isAutoLogged: true,
            metadata: {
                dealId: dealId.toString(),
                dealName,
                dealValue,
                outcome: 'won',
            },
        });
    },

    /**
     * Log deal lost
     */
    async logDealLost(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        dealId: string | Types.ObjectId,
        dealName: string,
        lostReason?: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            opportunityId: dealId,
            type: 'stage_change',
            title: `Deal "${dealName}" lost`,
            description: lostReason || 'Deal was closed and lost',
            automated: ctx.automated ?? true,
            isAutoLogged: true,
            metadata: {
                dealId: dealId.toString(),
                dealName,
                lostReason,
                outcome: 'lost',
            },
        });
    },

    /**
     * Log company field updated
     */
    async logCompanyUpdated(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        companyName: string,
        fieldName: string,
        oldValue: any,
        newValue: any
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'note',
            title: `${fieldName} updated`,
            description: oldValue
                ? `${fieldName} changed from "${oldValue}" to "${newValue}"`
                : `${fieldName} set to "${newValue}"`,
            automated: ctx.automated ?? false,
            isAutoLogged: true,
            metadata: {
                fieldName,
                oldValue,
                newValue,
                companyName,
            },
        });
    },

    /**
     * Log note added to company
     */
    async logNoteAdded(
        ctx: ActivityContext,
        companyId: string | Types.ObjectId,
        notePreview: string
    ) {
        return Activity.create({
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            entityType: 'company',
            entityId: companyId,
            type: 'note',
            title: 'Note added',
            description: notePreview.substring(0, 200) + (notePreview.length > 200 ? '...' : ''),
            automated: ctx.automated ?? false,
            isAutoLogged: false,
        });
    },
};

export default ActivityService;
