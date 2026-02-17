/**
 * ReportQueryEngine - Dynamic Report Generation Service
 *
 * Translates report definitions → MongoDB aggregation pipelines at runtime
 * Supports: Insight, Funnel, Time in Stage, Historical, and Stage Changed reports
 *
 * Data-First Architecture:
 * Source → Metric → Dimensions (GroupBy/SegmentBy) → Filters → Execute
 */

import mongoose, { Model, Types } from "mongoose";
import Opportunity from "../models/Opportunity";
import Contact from "../models/Contact";
import Company from "../models/Company";
import Task from "../models/Task";
import Ticket from "../models/Ticket";
import EmailMessage from "../models/EmailMessage";
import StageChangeEvent from "../models/StageChangeEvent";
import Deal from "../models/Deal";
import Activity from "../models/Activity";
import Campaign from "../models/Campaign";
import ContactLifecycleHistory from "../models/ContactLifecycleHistory";
import CallRecording from "../models/CallRecording";
import FormSubmission from "../models/FormSubmission";

export interface ReportDefinition {
  type: "insight" | "funnel" | "time_in_stage" | "historical" | "stage_changed";
  source: "opportunity" | "contact" | "company" | "task" | "ticket" | "email" | "deal" | "activity" | "campaign" | "lifecycle" | "call" | "form";
  metric: {
    field: string; // e.g., "value", "probability", "count"
    aggregation: "sum" | "avg" | "count" | "min" | "max";
  };
  groupBy?: string; // Dimension field (e.g., "stage", "status", "assignedTo")
  segmentBy?: string; // Secondary dimension for stacked charts
  period?: "day" | "week" | "month" | "quarter" | "year"; // Time period for historical reports
  filters?: FilterCondition[];
  dateRange?: {
    field: string; // Date field to filter (e.g., "createdAt")
    start?: Date;
    end?: Date;
  };
  pipelineId?: string; // For opportunity reports
  includedStages?: string[]; // For filtering specific stages
  periodComparison?: boolean; // Compare current vs previous period
  // P2: Multi-object joins
  joins?: {
    entity: string;     // e.g. "company", "contact"
    localField: string; // field on source entity
    foreignField: string; // field on joined entity (usually "_id")
    as: string;         // alias for joined doc
  }[];
  // P2: Calculated/formula fields
  calculatedFields?: {
    name: string;       // alias for the computed field
    expression: string; // e.g. "value * probability / 100"
  }[];
  // P2: Dynamic "run as" user filter
  runAsUserId?: string;
}

export interface FilterCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "nin" | "contains" | "exists";
  value: any;
  relatedEntity?: "company" | "contact"; // For graph traversal
}

export class ReportQueryEngine {
  /**
   * Relationship mapping for MongoDB $lookup joins
   */
  private getRelationshipConfig(
    source: string,
    relatedEntity: string
  ): { from: string; localField: string; foreignField: string; as: string } | null {
    const relationshipMap: Record<string, Record<string, any>> = {
      opportunity: {
        company: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" },
        contact: { from: "contacts", localField: "contactId", foreignField: "_id", as: "contact" },
      },
      contact: {
        company: { from: "companies", localField: "companyId", foreignField: "_id", as: "company" },
      },
      task: {
        opportunity: { from: "opportunities", localField: "opportunityId", foreignField: "_id", as: "opportunity" },
        contact: { from: "contacts", localField: "contactId", foreignField: "_id", as: "contact" },
      },
    };

    return relationshipMap[source]?.[relatedEntity] || null;
  }

  /**
   * Main execution method - routes to appropriate handler based on report type
   */
  async execute(
    definition: ReportDefinition,
    workspaceId: string | Types.ObjectId
  ): Promise<any> {
    const wsId = typeof workspaceId === "string" ? new Types.ObjectId(workspaceId) : workspaceId;

    switch (definition.type) {
      case "insight":
        return this.executeInsightReport(definition, wsId);
      case "historical":
        return this.executeHistoricalReport(definition, wsId);
      case "funnel":
        return this.executeFunnelReport(definition, wsId);
      case "time_in_stage":
        return this.executeTimeInStageReport(definition, wsId);
      case "stage_changed":
        return this.executeStageChangedReport(definition, wsId);
      default:
        throw new Error(`Unsupported report type: ${(definition as any).type}`);
    }
  }

  /**
   * Insight Report: Real-time snapshot of current state
   * Query strategy: Direct aggregation on entity collection
   */
  private async executeInsightReport(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId
  ): Promise<any> {
    const model = this.resolveModel(definition.source);
    const pipeline: any[] = [];

    // Match workspace and filters (with relational support)
    const { match, lookups } = this.buildMatchStage(definition, workspaceId);

    // Add initial match stage
    pipeline.push({ $match: match });

    // P2: Run-as user filter
    this.applyRunAsFilter(pipeline, definition);

    // Insert $lookup stages for relational filters
    if (lookups.length > 0) {
      pipeline.push(...lookups);
    }

    // P2: Multi-object joins
    pipeline.push(...this.buildJoinStages(definition));

    // P2: Calculated fields
    pipeline.push(...this.buildCalculatedFieldStages(definition));

    // Apply date range if provided
    if (definition.dateRange) {
      pipeline.push({
        $match: this.buildDateRangeMatch(definition.dateRange),
      });
    }

    // Group by dimension(s)
    if (definition.groupBy || definition.segmentBy) {
      const groupStage = this.buildGroupStage(definition);
      pipeline.push(groupStage);

      // Project for clean output
      const projection: any = {
        _id: 0,
        value: "$metricValue",
        count: "$count",
      };

      // Handle single dimension (groupBy only)
      if (definition.groupBy && !definition.segmentBy) {
        projection.dimension = `$_id.${definition.groupBy}`;
      }

      // Handle segmented data (groupBy + segmentBy)
      if (definition.groupBy && definition.segmentBy) {
        projection.dimension = `$_id.${definition.groupBy}`;
        projection.segment = `$_id.${definition.segmentBy}`;
      }

      pipeline.push({ $project: projection });
      pipeline.push({ $sort: { value: -1 } });
    } else {
      // Single metric (no grouping)
      const groupStage = {
        $group: {
          _id: null,
          metricValue: this.buildMetricExpression(definition.metric),
          count: { $sum: 1 },
        },
      };
      pipeline.push(groupStage);

      pipeline.push({
        $project: {
          _id: 0,
          value: "$metricValue",
          count: "$count",
        },
      });
    }

    const result = await model.aggregate(pipeline);
    return definition.groupBy || definition.segmentBy ? result : result[0] || { value: 0, count: 0 };
  }

  /**
   * Historical Report: Time-series of metric changes
   * Query strategy: Time-bucketed aggregation with $dateToString
   */
  private async executeHistoricalReport(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId
  ): Promise<any> {
    const model = this.resolveModel(definition.source);
    const pipeline: any[] = [];

    // Match workspace and filters (with relational support)
    const { match, lookups } = this.buildMatchStage(definition, workspaceId);

    // Add initial match stage
    pipeline.push({ $match: match });

    // P2: Run-as user filter
    this.applyRunAsFilter(pipeline, definition);

    // Insert $lookup stages for relational filters
    if (lookups.length > 0) {
      pipeline.push(...lookups);
    }

    // P2: Multi-object joins
    pipeline.push(...this.buildJoinStages(definition));

    // P2: Calculated fields
    pipeline.push(...this.buildCalculatedFieldStages(definition));

    // Apply date range
    if (definition.dateRange) {
      pipeline.push({
        $match: this.buildDateRangeMatch(definition.dateRange),
      });
    }

    // Group by time period
    const dateField = definition.dateRange?.field || "createdAt";
    const period = definition.period || "day";

    // Determine date format and grouping based on period
    const dateGrouping = this.buildDateGrouping(dateField, period);

    const groupStage: any = {
      $group: {
        _id: dateGrouping,
        metricValue: this.buildMetricExpression(definition.metric),
        count: { $sum: 1 },
      },
    };

    // Add secondary dimension if segmentBy is provided
    if (definition.segmentBy) {
      groupStage.$group._id = {
        date: groupStage.$group._id,
        segment: `$${definition.segmentBy}`,
      };
    }

    pipeline.push(groupStage);

    // Project for clean output
    pipeline.push({
      $project: {
        _id: 0,
        date: definition.segmentBy ? "$_id.date" : "$_id",
        segment: definition.segmentBy ? "$_id.segment" : undefined,
        value: "$metricValue",
        count: "$count",
      },
    });

    pipeline.push({ $sort: { date: 1 } });

    const result = await model.aggregate(pipeline);

    // Period comparison if requested
    if (definition.periodComparison && definition.dateRange) {
      const comparison = await this.calculatePeriodComparison(
        definition,
        workspaceId,
        result
      );
      return { current: result, previous: comparison.previous, percentChange: comparison.percentChange };
    }

    return result;
  }

  /**
   * Funnel Report: Conversion rates through stages
   * Query strategy: Sequential stage analysis on StageChangeEvent
   */
  private async executeFunnelReport(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId
  ): Promise<any> {
    if (!definition.pipelineId) {
      throw new Error("pipelineId is required for funnel reports");
    }

    const matchStage: any = {
      workspaceId,
      pipelineId: new Types.ObjectId(definition.pipelineId),
    };

    if (definition.dateRange) {
      matchStage.timestamp = {};
      if (definition.dateRange.start) matchStage.timestamp.$gte = definition.dateRange.start;
      if (definition.dateRange.end) matchStage.timestamp.$lte = definition.dateRange.end;
    }

    // Build filters (dashboard + definition)
    const { match } = this.buildMatchStage(definition, workspaceId);
    // Remove workspaceId/pipelineId to avoid collision/redundancy, or just pass it all
    delete match.workspaceId;
    delete match.pipelineId;

    const funnelData = await StageChangeEvent.getFunnelData(
      workspaceId,
      new Types.ObjectId(definition.pipelineId),
      definition.dateRange?.start,
      definition.dateRange?.end,
      match
    );

    // Calculate conversion rates
    const totalEntered = funnelData.length > 0 ? funnelData[0].count : 0;
    return funnelData.map((stage, index) => ({
      stageId: stage.stageId,
      stageName: stage.stageName,
      count: stage.count,
      conversionRate: totalEntered > 0 ? (stage.count / totalEntered) * 100 : 0,
      dropOffRate: index > 0 ? ((funnelData[index - 1].count - stage.count) / funnelData[index - 1].count) * 100 : 0,
    }));
  }

  /**
   * Time in Stage Report: Velocity/efficiency analysis
   * Query strategy: LEAD/LAG on events with $subtract
   */
  private async executeTimeInStageReport(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId
  ): Promise<any> {
    // Build filters (dashboard + definition)
    const { match } = this.buildMatchStage(definition, workspaceId);
    delete match.workspaceId;

    const metrics = await StageChangeEvent.getTimeInStageMetrics(
      workspaceId,
      definition.pipelineId ? new Types.ObjectId(definition.pipelineId) : undefined,
      definition.dateRange?.start,
      definition.dateRange?.end,
      match
    );

    // Convert milliseconds to days/hours
    return metrics.map((metric: any) => ({
      stageId: metric.stageId,
      stageName: metric.stageName,
      avgDurationDays: metric.avgDurationMs / (1000 * 60 * 60 * 24),
      avgDurationHours: metric.avgDurationMs / (1000 * 60 * 60),
      minDurationDays: metric.minDurationMs / (1000 * 60 * 60 * 24),
      maxDurationDays: metric.maxDurationMs / (1000 * 60 * 60 * 24),
      opportunityCount: metric.opportunityCount,
    }));
  }

  /**
   * Stage Changed Report: Flow/Throughput analysis
   * Query strategy: $group on events by period + stage
   */
  private async executeStageChangedReport(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId
  ): Promise<any> {
    const matchStage: any = { workspaceId };

    if (definition.pipelineId) {
      matchStage.pipelineId = new Types.ObjectId(definition.pipelineId);
    }

    if (definition.dateRange) {
      matchStage.timestamp = {};
      if (definition.dateRange.start) matchStage.timestamp.$gte = definition.dateRange.start;
      if (definition.dateRange.end) matchStage.timestamp.$lte = definition.dateRange.end;
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            stage: "$newStageId",
            stageName: "$newStageName",
          },
          entering: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ["$metadata.value", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          stageId: "$_id.stage",
          stageName: "$_id.stageName",
          entering: 1,
          totalValue: 1,
        },
      },
      { $sort: { entering: -1 } },
    ];

    return await StageChangeEvent.aggregate(pipeline);
  }

  // ─── P2: Helper Methods ──────────────────────────────────────

  /**
   * P2: Build $lookup + $unwind stages for multi-object joins
   */
  private buildJoinStages(definition: ReportDefinition): any[] {
    if (!definition.joins || definition.joins.length === 0) return [];

    const stages: any[] = [];
    const entityToCollection: Record<string, string> = {
      opportunity: "opportunities",
      contact: "contacts",
      company: "companies",
      task: "tasks",
      ticket: "tickets",
      email: "emailmessages",
      deal: "deals",
      activity: "activities",
      campaign: "campaigns",
      lifecycle: "contactlifecyclehistories",
      call: "callrecordings",
      form: "formsubmissions",
    };

    for (const join of definition.joins) {
      const collection = entityToCollection[join.entity];
      if (!collection) continue;

      stages.push({
        $lookup: {
          from: collection,
          localField: join.localField,
          foreignField: join.foreignField,
          as: join.as,
        },
      });
      stages.push({
        $unwind: {
          path: `$${join.as}`,
          preserveNullAndEmptyArrays: true,
        },
      });
    }

    return stages;
  }

  /**
   * P2: Build $addFields stage for calculated/formula fields
   * Supports simple expressions: field1 [+|-|*|/] field2 [+|-|*|/] number
   */
  private buildCalculatedFieldStages(definition: ReportDefinition): any[] {
    if (!definition.calculatedFields || definition.calculatedFields.length === 0) return [];

    const addFields: Record<string, any> = {};

    for (const calc of definition.calculatedFields) {
      // Sanitize: only allow field names, numbers, and basic operators
      const sanitized = calc.expression.replace(/[^a-zA-Z0-9_.+\-*/ ()]/g, "");
      addFields[calc.name] = this.parseExpression(sanitized);
    }

    return Object.keys(addFields).length > 0 ? [{ $addFields: addFields }] : [];
  }

  /**
   * Parse a simple math expression into MongoDB aggregation expression
   * e.g. "value * probability / 100" → { $divide: [{ $multiply: ["$value", "$probability"] }, 100] }
   */
  private parseExpression(expr: string): any {
    const tokens = expr.trim().split(/\s+/);

    if (tokens.length === 1) {
      const val = Number(tokens[0]);
      return isNaN(val) ? `$${tokens[0]}` : val;
    }

    // Build left-to-right (no operator precedence — keeps it simple)
    let result = this.parseExpression(tokens[0]);

    for (let i = 1; i < tokens.length; i += 2) {
      const operator = tokens[i];
      const right = this.parseExpression(tokens[i + 1] || "0");

      const opMap: Record<string, string> = {
        "+": "$add",
        "-": "$subtract",
        "*": "$multiply",
        "/": "$divide",
      };

      const mongoOp = opMap[operator];
      if (mongoOp) {
        result = { [mongoOp]: [result, right] };
      }
    }

    return result;
  }

  /**
   * P2: Apply "run as" user filter — scopes all data to a specific user
   */
  private applyRunAsFilter(pipeline: any[], definition: ReportDefinition): void {
    if (!definition.runAsUserId) return;

    const userId = new Types.ObjectId(definition.runAsUserId);
    // Add a match stage that filters by owner/assignee fields
    pipeline.push({
      $match: {
        $or: [
          { assignedTo: userId },
          { ownerId: userId },
          { userId: userId },
          { createdBy: userId },
        ],
      },
    });
  }

  /**
   * Resolve entity name to Mongoose model
   */
  private resolveModel(entity: string): Model<any> {
    const models: Record<string, Model<any>> = {
      opportunity: Opportunity,
      contact: Contact,
      company: Company,
      task: Task,
      ticket: Ticket,
      email: EmailMessage,
      deal: Deal, // Fixes D2
      activity: Activity,
      campaign: Campaign,
      lifecycle: ContactLifecycleHistory,
      call: CallRecording,
      form: FormSubmission,
    };

    const model = models[entity];
    if (!model) {
      throw new Error(`Unknown entity type: ${entity}`);
    }

    return model;
  }

  /**
   * Build MongoDB $match stage from filters
   * Returns both match conditions and $lookup stages for relational filters
   */
  private buildMatchStage(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId
  ): { match: any; lookups: any[] } {
    const match: any = { workspaceId };
    const lookups: any[] = [];
    const relationalMatches: Record<string, any> = {};

    // Add pipelineId for opportunity reports
    if (definition.source === "opportunity" && definition.pipelineId) {
      match.pipelineId = new Types.ObjectId(definition.pipelineId);
    }

    // Add includedStages filter for opportunity reports
    if (definition.source === "opportunity" && definition.includedStages && definition.includedStages.length > 0) {
      match.stageId = { $in: definition.includedStages.map((id) => new Types.ObjectId(id)) };
    }

    // Process filters
    if (definition.filters) {
      for (const filter of definition.filters) {
        if (filter.relatedEntity) {
          // Relational filter - requires $lookup
          const lookupConfig = this.getRelationshipConfig(definition.source, filter.relatedEntity);

          if (lookupConfig) {
            // Add $lookup stage if not already added
            const lookupKey = lookupConfig.as;
            if (!relationalMatches[lookupKey]) {
              lookups.push({
                $lookup: {
                  from: lookupConfig.from,
                  localField: lookupConfig.localField,
                  foreignField: lookupConfig.foreignField,
                  as: lookupConfig.as,
                },
              });
              lookups.push({
                $unwind: {
                  path: `$${lookupConfig.as}`,
                  preserveNullAndEmptyArrays: false,
                },
              });
              relationalMatches[lookupKey] = true;
            }

            // Add match condition on joined field
            const joinedFieldPath = `${lookupConfig.as}.${filter.field}`;
            match[joinedFieldPath] = this.buildFilterCondition(filter);
          }
        } else {
          // Direct filter on source entity
          match[filter.field] = this.buildFilterCondition(filter);
        }
      }
    }

    return { match, lookups };
  }

  /**
   * Translate filter condition to MongoDB operator
   */
  private buildFilterCondition(filter: FilterCondition): any {
    switch (filter.operator) {
      case "eq":
        return filter.value;
      case "ne":
        return { $ne: filter.value };
      case "gt":
        return { $gt: filter.value };
      case "lt":
        return { $lt: filter.value };
      case "gte":
        return { $gte: filter.value };
      case "lte":
        return { $lte: filter.value };
      case "in":
        return { $in: Array.isArray(filter.value) ? filter.value : [filter.value] };
      case "nin":
        return { $nin: Array.isArray(filter.value) ? filter.value : [filter.value] };
      case "contains":
        return { $regex: filter.value, $options: "i" };
      case "exists":
        return { $exists: filter.value };
      default:
        return filter.value;
    }
  }

  /**
   * Build date range match condition
   */
  private buildDateRangeMatch(dateRange: NonNullable<ReportDefinition["dateRange"]>): any {
    const match: any = {};
    if (dateRange.start || dateRange.end) {
      match[dateRange.field] = {};
      if (dateRange.start) match[dateRange.field].$gte = dateRange.start;
      if (dateRange.end) match[dateRange.field].$lte = dateRange.end;
    }
    return match;
  }

  /**
   * Build $group stage with metric aggregation
   */
  private buildGroupStage(definition: ReportDefinition): any {
    const groupId: any = {};

    if (definition.groupBy) {
      groupId[definition.groupBy] = `$${definition.groupBy}`;
    }

    if (definition.segmentBy) {
      groupId[definition.segmentBy] = `$${definition.segmentBy}`;
    }

    return {
      $group: {
        _id: groupId,
        metricValue: this.buildMetricExpression(definition.metric),
        count: { $sum: 1 },
      },
    };
  }

  /**
   * Build date grouping expression based on period
   */
  private buildDateGrouping(dateField: string, period: string): any {
    const datePath = `$${dateField}`;

    switch (period) {
      case "day":
        return {
          $dateToString: {
            format: "%Y-%m-%d",
            date: datePath,
          },
        };

      case "week":
        return {
          $dateToString: {
            format: "%Y-W%V", // ISO week format
            date: datePath,
          },
        };

      case "month":
        return {
          $dateToString: {
            format: "%Y-%m",
            date: datePath,
          },
        };

      case "quarter":
        return {
          $concat: [
            { $dateToString: { format: "%Y", date: datePath } },
            "-Q",
            {
              $toString: {
                $ceil: {
                  $divide: [{ $month: datePath }, 3],
                },
              },
            },
          ],
        };

      case "year":
        return {
          $dateToString: {
            format: "%Y",
            date: datePath,
          },
        };

      default:
        // Default to daily
        return {
          $dateToString: {
            format: "%Y-%m-%d",
            date: datePath,
          },
        };
    }
  }

  /**
   * Build metric aggregation expression
   */
  private buildMetricExpression(metric: ReportDefinition["metric"]): any {
    if (metric.aggregation === "count") {
      return { $sum: 1 };
    }

    const fieldPath = metric.field.startsWith("$") ? metric.field : `$${metric.field}`;

    switch (metric.aggregation) {
      case "sum":
        return { $sum: fieldPath };
      case "avg":
        return { $avg: fieldPath };
      case "min":
        return { $min: fieldPath };
      case "max":
        return { $max: fieldPath };
      default:
        return { $sum: 1 };
    }
  }

  /**
   * Calculate period comparison (current vs previous period)
   */
  private async calculatePeriodComparison(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId,
    currentData: any[]
  ): Promise<any> {
    if (!definition.dateRange?.start || !definition.dateRange?.end) {
      return { previous: [], percentChange: 0 };
    }

    const periodLength = definition.dateRange.end.getTime() - definition.dateRange.start.getTime();
    const previousStart = new Date(definition.dateRange.start.getTime() - periodLength);
    const previousEnd = new Date(definition.dateRange.end.getTime() - periodLength);

    const previousDefinition = {
      ...definition,
      dateRange: {
        ...definition.dateRange,
        start: previousStart,
        end: previousEnd,
      },
    };

    const previousData = await this.executeHistoricalReport(previousDefinition, workspaceId);

    // Calculate percent change
    const currentTotal = currentData.reduce((sum, item) => sum + (item.value || 0), 0);
    const previousTotal = Array.isArray(previousData)
      ? previousData.reduce((sum: number, item: any) => sum + (item.value || 0), 0)
      : 0;

    const percentChange =
      previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      previous: previousData,
      percentChange,
    };
  }
  /**
   * Drill-Down: Fetch raw records matching the report + segment context
   */
  async executeDrillDown(
    definition: ReportDefinition,
    workspaceId: Types.ObjectId,
    context: {
      groupByValue?: any;
      segmentByValue?: any;
      page?: number;
      limit?: number;
      sort?: { field: string; direction: "asc" | "desc" };
      search?: string;
    }
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const model = this.resolveModel(definition.source);
    const pipeline: any[] = [];
    const page = context.page || 1;
    const limit = context.limit || 20;
    const skip = (page - 1) * limit;

    // 1. Base Match (Workspace + Global Filters)
    const { match, lookups } = this.buildMatchStage(definition, workspaceId);

    // 2. Apply Context Filters (Drill-down specifics)
    if (context.groupByValue !== undefined && definition.groupBy) {
      match[definition.groupBy] = context.groupByValue;
    }

    if (context.segmentByValue !== undefined && definition.segmentBy) {
      match[definition.segmentBy] = context.segmentByValue;
    }

    // 3. Search (Regex on common fields)
    if (context.search) {
      const searchRegex = { $regex: context.search, $options: "i" };
      const searchOr: any[] = [];

      // Smart field selection based on source entity
      switch (definition.source) {
        case "opportunity":
        case "deal":
          searchOr.push({ name: searchRegex });
          break;
        case "contact":
          searchOr.push({ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex });
          break;
        case "company":
          searchOr.push({ name: searchRegex }, { domain: searchRegex });
          break;
        case "task":
        case "ticket":
          searchOr.push({ title: searchRegex });
          break;
        case "email":
          searchOr.push({ subject: searchRegex }, { "to.email": searchRegex });
          break;
        case "campaign":
          searchOr.push({ name: searchRegex });
          break;
        default:
          // Fallback generic fields
          searchOr.push({ name: searchRegex }, { title: searchRegex });
      }

      if (searchOr.length > 0) {
        match.$or = [...(match.$or || []), ...searchOr];
      }
    }

    // Add initial match
    pipeline.push({ $match: match });

    // Add lookups
    if (lookups.length > 0) {
      pipeline.push(...lookups);
    }

    // Apply date range if provided
    if (definition.dateRange) {
      pipeline.push({
        $match: this.buildDateRangeMatch(definition.dateRange),
      });
    }

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await model.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // 4. Sort
    const sortStage: any = {};
    if (context.sort && context.sort.field) {
      sortStage[context.sort.field] = context.sort.direction === "desc" ? -1 : 1;
    } else {
      // Default sort
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Lookup generic "name" or "title" fields for display if needed
    // For now, just return raw docs. The UI can handle display.

    // Perform Lookups for easier display (e.g. assignedTo user)
    // Only add if source supports assignedTo (most do)
    if (["opportunity", "contact", "company", "task", "ticket", "deal"].includes(definition.source)) {
      pipeline.push(
        {
          $lookup: {
            from: "users",
            localField: "assignedTo",
            foreignField: "_id",
            as: "assignee"
          }
        },
        {
          $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true }
        }
      );
    }

    const data = await model.aggregate(pipeline);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new ReportQueryEngine();
