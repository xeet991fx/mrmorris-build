import { workflowService } from '../../services/workflow';

/**
 * Bridge between new event system and existing workflow system
 * Maps new event types to old workflow trigger types
 */
export class EventBridge {
  /**
   * Map new event type to old workflow trigger format
   * Example: "contact.created" → "contact:created"
   */
  private mapEventToWorkflowTrigger(eventType: string): string {
    // New event format: "contact.created"
    // Old workflow format: "contact:created"
    return eventType.replace('.', ':');
  }

  /**
   * Forward event to workflow system (backward compatibility)
   */
  async forwardToWorkflows(
    eventType: string,
    entity: any,
    workspaceId: string
  ): Promise<void> {
    try {
      // Convert new event format to old format
      const oldEventType = this.mapEventToWorkflowTrigger(eventType);

      // Trigger workflow enrollment using existing system
      await workflowService.checkAndEnroll(oldEventType, entity, workspaceId);

      console.log(
        `✅ Event forwarded to workflows: ${eventType} → ${oldEventType}`
      );
    } catch (error) {
      console.error(`❌ Failed to forward event to workflows:`, error);
      // Don't throw - this is backward compatibility, not critical
    }
  }
}

export const eventBridge = new EventBridge();
export default eventBridge;
