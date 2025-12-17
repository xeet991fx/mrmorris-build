import { BaseConsumer } from './BaseConsumer';
import { BaseEvent } from '../types/base.types';
import Activity from '../../models/Activity';

/**
 * Logs significant events to the Activity model
 * Creates activity timeline entries for important CRM events
 */
export class ActivityLogConsumer extends BaseConsumer {
  get name(): string {
    return 'ActivityLogConsumer';
  }

  get eventTypes(): string[] {
    return [
      'contact.created',
      'contact.status_changed',
      'deal.created',
      'deal.stage_changed',
      'deal.won',
      'deal.lost',
      'email.replied',
      'activity.meeting_completed',
      'activity.call_completed',
    ];
  }

  async process(event: BaseEvent): Promise<void> {
    const activityData = this.mapEventToActivity(event);

    if (!activityData) {
      return;
    }

    await Activity.create({
      ...activityData,
      workspaceId: event.metadata.workspaceId,
      userId: event.metadata.userId,
      automated: event.metadata.source !== 'api',
    });

    console.log(`✅ Activity logged for event: ${event.eventType}`);
  }

  private mapEventToActivity(event: BaseEvent): any {
    switch (event.eventType) {
      case 'contact.created':
        return {
          type: 'note',
          title: 'Contact Created',
          description: `New contact: ${event.payload.firstName} ${event.payload.lastName}`,
          entityType: 'contact',
          entityId: event.payload.contactId,
        };

      case 'contact.status_changed':
        return {
          type: 'note',
          title: 'Contact Status Changed',
          description: `Status changed from ${event.payload.oldStatus} to ${event.payload.newStatus}`,
          entityType: 'contact',
          entityId: event.payload.contactId,
          metadata: {
            oldStatus: event.payload.oldStatus,
            newStatus: event.payload.newStatus,
          },
        };

      case 'deal.created':
        return {
          type: 'note',
          title: 'Deal Created',
          description: `New deal: ${event.payload.name} ($${event.payload.value})`,
          entityType: 'deal',
          entityId: event.payload.dealId,
          opportunityId: event.payload.dealId,
        };

      case 'deal.stage_changed':
        return {
          type: 'stage_change',
          title: 'Deal Stage Changed',
          description: `Moved from ${event.payload.oldStageName} to ${event.payload.newStageName}`,
          entityType: 'deal',
          entityId: event.payload.dealId,
          opportunityId: event.payload.dealId,
          metadata: {
            fromStage: event.payload.oldStageName,
            toStage: event.payload.newStageName,
          },
        };

      case 'deal.won':
        return {
          type: 'note',
          title: 'Deal Won!',
          description: `Deal closed successfully ($${event.payload.value})`,
          entityType: 'deal',
          entityId: event.payload.dealId,
          opportunityId: event.payload.dealId,
        };

      case 'deal.lost':
        return {
          type: 'note',
          title: 'Deal Lost',
          description: `Deal lost${event.payload.reason ? `: ${event.payload.reason}` : ''}`,
          entityType: 'deal',
          entityId: event.payload.dealId,
          opportunityId: event.payload.dealId,
        };

      case 'email.replied':
        return {
          type: 'email',
          title: 'Email Reply Received',
          description: event.payload.subject,
          emailSubject: event.payload.subject,
          emailBody: event.payload.bodyPreview,
          direction: 'inbound',
          entityType: 'contact',
          entityId: event.payload.contactId,
        };

      case 'activity.meeting_completed':
        return {
          type: 'meeting',
          title: 'Meeting Completed',
          description: event.payload.notes,
          duration: event.payload.duration * 60, // convert to seconds
          entityType: 'contact',
          entityId: event.payload.contactId,
          opportunityId: event.payload.dealId,
        };

      case 'activity.call_completed':
        return {
          type: 'call',
          title: 'Call Completed',
          description: event.payload.notes,
          duration: event.payload.duration, // already in seconds
          entityType: 'contact',
          entityId: event.payload.contactId,
          opportunityId: event.payload.dealId,
          metadata: {
            outcome: event.payload.outcome,
          },
        };

      default:
        return null;
    }
  }
}
