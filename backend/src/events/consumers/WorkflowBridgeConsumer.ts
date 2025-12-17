import { BaseConsumer } from './BaseConsumer';
import { BaseEvent } from '../types/base.types';
import { eventBridge } from '../publisher/EventBridge';
import Contact from '../../models/Contact';
import Opportunity from '../../models/Opportunity';
import Company from '../../models/Company';

/**
 * Bridges events to the existing workflow system
 * Ensures backward compatibility while new event system runs in parallel
 */
export class WorkflowBridgeConsumer extends BaseConsumer {
  get name(): string {
    return 'WorkflowBridgeConsumer';
  }

  get eventTypes(): string[] {
    return [
      'contact.created',
      'contact.updated',
      'contact.job_changed',
      'deal.created',
      'deal.stage_changed',
      'company.created',
      'company.updated',
    ];
  }

  async process(event: BaseEvent): Promise<void> {
    // Fetch the entity from database
    const entity = await this.fetchEntity(event);

    if (!entity) {
      console.warn(
        `⚠️ Entity not found for event ${event.eventType} (${this.extractEntityId(event)})`
      );
      return;
    }

    // Forward to workflow system
    await eventBridge.forwardToWorkflows(
      event.eventType,
      entity,
      event.metadata.workspaceId
    );
  }

  private async fetchEntity(event: BaseEvent): Promise<any> {
    const entityId = this.extractEntityId(event);

    if (!entityId) {
      return null;
    }

    // Determine entity type from event type
    if (event.eventType.startsWith('contact.')) {
      return Contact.findById(entityId);
    } else if (event.eventType.startsWith('deal.')) {
      return Opportunity.findById(entityId);
    } else if (event.eventType.startsWith('company.')) {
      return Company.findById(entityId);
    }

    return null;
  }

  private extractEntityId(event: BaseEvent): string | null {
    // Extract ID from payload based on event type
    if ('contactId' in event.payload) {
      return event.payload.contactId;
    } else if ('dealId' in event.payload) {
      return event.payload.dealId;
    } else if ('companyId' in event.payload) {
      return event.payload.companyId;
    }

    return null;
  }
}
