import mongoose from 'mongoose';
import { queueEventTriggeredExecution, AgentEventType } from '../jobs/agentEventTriggerJob';
import Agent, { IAgent } from '../models/Agent';

/**
 * Agent Event Listener Service - Story 3.4
 * Listens to CRM events and triggers matching agents
 */

// Condition operator types
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists';

// Condition interface
export interface IEventCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

// Event trigger configuration interface
export interface IEventTriggerConfig {
  eventType: AgentEventType;
  conditions?: IEventCondition[];
}

export class AgentEventListenerService {
  /**
   * Handle Contact Created event
   * Finds matching agents with contact_created triggers and queues executions
   */
  static async handleContactCreated(
    contact: any,
    workspaceId: string,
    triggeredBy?: string
  ): Promise<void> {
    console.log(`📩 Handling contact_created event for workspace ${workspaceId}`);

    const matchingAgents = await this.findMatchingAgents(workspaceId, 'contact_created');

    if (matchingAgents.length === 0) {
      console.log(`No agents configured for contact_created in workspace ${workspaceId}`);
      return;
    }

    console.log(`Found ${matchingAgents.length} agent(s) matching contact_created event`);

    // Queue executions for all matching agents (AC5: Parallel execution)
    for (const agent of matchingAgents) {
      const eventTrigger = this.getEventTrigger(agent, 'contact_created');

      // AC4: Evaluate conditions before queueing
      const conditionsMet = this.evaluateConditions(
        eventTrigger?.config?.conditions || [],
        { contact }
      );

      if (conditionsMet) {
        await queueEventTriggeredExecution(
          agent._id.toString(),
          workspaceId,
          'contact_created',
          { contact },
          triggeredBy
        );
      } else {
        console.log(`⏭️ Agent ${agent._id} skipped - conditions not met`);
      }
    }
  }

  /**
   * Handle Deal Stage Updated event
   * Finds matching agents with deal_stage_updated triggers and queues executions
   */
  static async handleDealStageUpdated(
    deal: any,
    previousStage: string,
    newStage: string,
    workspaceId: string,
    triggeredBy?: string
  ): Promise<void> {
    console.log(`📩 Handling deal_stage_updated event for workspace ${workspaceId}`);
    console.log(`Stage change: ${previousStage} → ${newStage}`);

    const matchingAgents = await this.findMatchingAgents(workspaceId, 'deal_stage_updated');

    if (matchingAgents.length === 0) {
      console.log(`No agents configured for deal_stage_updated in workspace ${workspaceId}`);
      return;
    }

    console.log(`Found ${matchingAgents.length} agent(s) matching deal_stage_updated event`);

    // Queue executions for all matching agents
    for (const agent of matchingAgents) {
      const eventTrigger = this.getEventTrigger(agent, 'deal_stage_updated');

      // AC4: Evaluate conditions before queueing
      const conditionsMet = this.evaluateConditions(
        eventTrigger?.config?.conditions || [],
        { deal, previousStage, newStage }
      );

      if (conditionsMet) {
        await queueEventTriggeredExecution(
          agent._id.toString(),
          workspaceId,
          'deal_stage_updated',
          { deal, previousStage, newStage },
          triggeredBy
        );
      } else {
        console.log(`⏭️ Agent ${agent._id} skipped - conditions not met`);
      }
    }
  }

  /**
   * Handle Form Submitted event
   * Finds matching agents with form_submitted triggers and queues executions
   */
  static async handleFormSubmitted(
    formData: {
      formId?: string;
      fields: Record<string, any>;
    },
    contact: any | null,
    workspaceId: string,
    triggeredBy?: string
  ): Promise<void> {
    console.log(`📩 Handling form_submitted event for workspace ${workspaceId}`);

    const matchingAgents = await this.findMatchingAgents(workspaceId, 'form_submitted');

    if (matchingAgents.length === 0) {
      console.log(`No agents configured for form_submitted in workspace ${workspaceId}`);
      return;
    }

    console.log(`Found ${matchingAgents.length} agent(s) matching form_submitted event`);

    const isNewContact = contact?._id ? true : false;

    // Queue executions for all matching agents
    for (const agent of matchingAgents) {
      const eventTrigger = this.getEventTrigger(agent, 'form_submitted');

      // AC4: Evaluate conditions before queueing
      const conditionsMet = this.evaluateConditions(
        eventTrigger?.config?.conditions || [],
        { form: formData, contact, isNewContact }
      );

      if (conditionsMet) {
        await queueEventTriggeredExecution(
          agent._id.toString(),
          workspaceId,
          'form_submitted',
          {
            form: {
              formId: formData.formId,
              submittedAt: new Date(),
              fields: formData.fields,
            },
            contact,
            isNewContact,
          },
          triggeredBy
        );
      } else {
        console.log(`⏭️ Agent ${agent._id} skipped - conditions not met`);
      }
    }
  }

  /**
   * Find all Live agents with matching event triggers
   * AC5: Returns all agents that should respond to the event
   */
  static async findMatchingAgents(
    workspaceId: string,
    eventType: AgentEventType
  ): Promise<IAgent[]> {
    const agents = await Agent.find({
      workspace: new mongoose.Types.ObjectId(workspaceId),
      status: 'Live',
      'triggers.type': 'event',
      'triggers.config.eventType': eventType,
      'triggers.enabled': { $ne: false },
    }).lean();

    return agents as IAgent[];
  }

  /**
   * Get the specific event trigger from an agent
   */
  private static getEventTrigger(
    agent: IAgent,
    eventType: AgentEventType
  ): { config?: IEventTriggerConfig } | undefined {
    return agent.triggers?.find(
      (t: any) =>
        t.type === 'event' &&
        t.config?.eventType === eventType &&
        t.enabled !== false
    );
  }

  /**
   * AC4: Evaluate event conditions
   * Returns true if all conditions are met (AND logic)
   * Returns true if no conditions are specified
   */
  static evaluateConditions(
    conditions: IEventCondition[],
    context: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const result = conditions.every((condition) => {
      const fieldValue = this.getNestedValue(context, condition.field);
      const conditionResult = this.evaluateCondition(
        fieldValue,
        condition.operator,
        condition.value
      );

      console.log(`Condition: ${condition.field} ${condition.operator} ${condition.value} → ${conditionResult} (actual: ${fieldValue})`);

      return conditionResult;
    });

    return result;
  }

  /**
   * Get a nested value from an object using dot notation
   * e.g., 'deal.value' from { deal: { value: 10000 } }
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) {
      console.warn(`⚠️ Missing object or path for condition evaluation`);
      return undefined;
    }

    return path.split('.').reduce((acc, part) => {
      if (acc === undefined || acc === null) {
        return undefined;
      }
      return acc[part];
    }, obj);
  }

  /**
   * Evaluate a single condition
   * AC4: Supports all required operators
   */
  private static evaluateCondition(
    fieldValue: any,
    operator: ConditionOperator,
    compareValue: any
  ): boolean {
    // Handle missing fields gracefully (default to false)
    if (fieldValue === undefined && operator !== 'not_exists' && operator !== 'exists') {
      console.warn(`⚠️ Field value is undefined, condition evaluates to false`);
      return false;
    }

    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;

      case 'not_equals':
        return fieldValue !== compareValue;

      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);

      case 'less_than':
        return Number(fieldValue) < Number(compareValue);

      case 'contains':
        return String(fieldValue || '')
          .toLowerCase()
          .includes(String(compareValue || '').toLowerCase());

      case 'not_contains':
        return !String(fieldValue || '')
          .toLowerCase()
          .includes(String(compareValue || '').toLowerCase());

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;

      default:
        console.warn(`⚠️ Unknown operator: ${operator}, defaulting to false`);
        return false;
    }
  }
}
