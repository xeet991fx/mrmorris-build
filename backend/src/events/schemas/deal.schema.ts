import { z } from 'zod';
import { EventMetadataSchema } from './contact.schema';

// Deal stage changed payload schema
export const DealStageChangedPayloadSchema = z.object({
  dealId: z.string(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  pipelineId: z.string(),
  oldStageId: z.string(),
  oldStageName: z.string(),
  newStageId: z.string(),
  newStageName: z.string(),
  value: z.number(),
  movedAt: z.date(),
  movedBy: z.string().optional(),
  automated: z.boolean(),
  stageHistory: z.array(
    z.object({
      stageId: z.string(),
      stageName: z.string(),
      enteredAt: z.date(),
    })
  ),
});

export const DealStageChangedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('deal.stage_changed'),
  payload: DealStageChangedPayloadSchema,
});

// Deal created payload schema
export const DealCreatedPayloadSchema = z.object({
  dealId: z.string(),
  name: z.string(),
  value: z.number(),
  pipelineId: z.string(),
  stageId: z.string(),
  stageName: z.string(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  assignedTo: z.string().optional(),
  expectedCloseDate: z.date().optional(),
  source: z.string().optional(),
});

export const DealCreatedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('deal.created'),
  payload: DealCreatedPayloadSchema,
});

// Deal value changed schema
export const DealValueChangedPayloadSchema = z.object({
  dealId: z.string(),
  oldValue: z.number(),
  newValue: z.number(),
  reason: z.string().optional(),
});

export const DealValueChangedEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('deal.value_changed'),
  payload: DealValueChangedPayloadSchema,
});

// Deal won schema
export const DealWonPayloadSchema = z.object({
  dealId: z.string(),
  value: z.number(),
  closeDate: z.date(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export const DealWonEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('deal.won'),
  payload: DealWonPayloadSchema,
});

// Deal lost schema
export const DealLostPayloadSchema = z.object({
  dealId: z.string(),
  value: z.number(),
  reason: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export const DealLostEventSchema = z.object({
  metadata: EventMetadataSchema,
  eventType: z.literal('deal.lost'),
  payload: DealLostPayloadSchema,
});
