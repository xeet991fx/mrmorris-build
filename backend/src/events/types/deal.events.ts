import { BaseEvent } from './base.types';

// Event type constants
export const DEAL_EVENTS = {
  CREATED: 'deal.created',
  UPDATED: 'deal.updated',
  DELETED: 'deal.deleted',
  STAGE_CHANGED: 'deal.stage_changed',
  VALUE_CHANGED: 'deal.value_changed',
  WON: 'deal.won',
  LOST: 'deal.lost',
  REOPENED: 'deal.reopened',
  ASSIGNED: 'deal.assigned',
} as const;

export type DealEventType = typeof DEAL_EVENTS[keyof typeof DEAL_EVENTS];

// Payload interfaces
export interface DealStageChangedPayload {
  dealId: string;
  contactId?: string;
  companyId?: string;
  pipelineId: string;
  oldStageId: string;
  oldStageName: string;
  newStageId: string;
  newStageName: string;
  value: number;
  movedAt: Date;
  movedBy?: string;
  automated: boolean;
  stageHistory: Array<{
    stageId: string;
    stageName: string;
    enteredAt: Date;
  }>;
}

export interface DealCreatedPayload {
  dealId: string;
  name: string;
  value: number;
  pipelineId: string;
  stageId: string;
  stageName: string;
  contactId?: string;
  companyId?: string;
  assignedTo?: string;
  expectedCloseDate?: Date;
  source?: string;
}

export interface DealValueChangedPayload {
  dealId: string;
  oldValue: number;
  newValue: number;
  reason?: string;
}

export interface DealWonPayload {
  dealId: string;
  value: number;
  closeDate: Date;
  contactId?: string;
  companyId?: string;
}

export interface DealLostPayload {
  dealId: string;
  value: number;
  reason?: string;
  contactId?: string;
  companyId?: string;
}

export interface DealAssignedPayload {
  dealId: string;
  oldAssignedTo?: string;
  newAssignedTo: string;
}

// Full event types
export type DealStageChangedEvent = BaseEvent<DealStageChangedPayload>;
export type DealCreatedEvent = BaseEvent<DealCreatedPayload>;
export type DealValueChangedEvent = BaseEvent<DealValueChangedPayload>;
export type DealWonEvent = BaseEvent<DealWonPayload>;
export type DealLostEvent = BaseEvent<DealLostPayload>;
export type DealAssignedEvent = BaseEvent<DealAssignedPayload>;
