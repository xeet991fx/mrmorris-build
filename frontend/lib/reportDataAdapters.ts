/**
 * Report Data Adapters
 *
 * Transforms ReportQueryEngine output to chart-compatible shapes.
 * Maintains backward compatibility with legacy reports.
 */

export interface ReportDefinition {
    source: string;
    type: "insight" | "historical" | "funnel" | "time_in_stage" | "stage_changed";
    metric: {
        field: string;
        aggregation: "count" | "sum" | "avg" | "min" | "max";
    };
    groupBy?: string;
    segmentBy?: string;
    period?: "day" | "week" | "month" | "quarter" | "year";
    filters?: Array<{
        field: string;
        operator: string;
        value?: any;
        relatedEntity?: string;
    }>;
    dateRange?: {
        field: string;
        start?: Date;
        end?: Date;
    };
    pipelineId?: string;
    periodComparison?: boolean;
}

/**
 * Main adapter router
 */
export function adaptReportData(
    rawData: any,
    chartType: string,
    reportType: string,
    definition?: ReportDefinition
) {
    // Legacy reports pass through unchanged
    if (!definition) return rawData;

    // Route to appropriate adapter based on definition type
    switch (definition.type) {
        case "insight":
            if (chartType === "number") {
                return adaptInsightToNumberCard(rawData, definition);
            }
            if (chartType === "bar" || chartType === "pie") {
                return { data: adaptInsightToBarChart(rawData, definition) };
            }
            return rawData;

        case "historical":
            return adaptHistoricalToLineChart(rawData, definition);

        case "funnel":
            return adaptFunnelData(rawData);

        default:
            return rawData;
    }
}

/**
 * Insight (no groupBy) → NumberCard
 * Input: { value: 1000, count: 50 }
 * Output: { value: 1000, label: "...", format: "currency", count: 50 }
 */
function adaptInsightToNumberCard(data: any, definition: ReportDefinition) {
    if (!data) return { value: 0, count: 0 };

    // Determine format based on metric field
    let format = "number";
    if (definition.metric.field?.toLowerCase().includes("value") ||
        definition.metric.field?.toLowerCase().includes("revenue") ||
        definition.metric.field?.toLowerCase().includes("amount")) {
        format = "currency";
    }
    if (definition.metric.field?.toLowerCase().includes("rate") ||
        definition.metric.field?.toLowerCase().includes("percent")) {
        format = "percent";
    }

    return {
        value: data.value || 0,
        count: data.count || 0,
        format,
        label: definition.metric.aggregation === "count" ? "Total" : definition.metric.field,
    };
}

/**
 * Insight (with groupBy) → BarChart/PieChart
 * Input (simple): [{ dimension: "Open", value: 100, count: 5 }, ...]
 * Input (segmented): [{ dimension: "Open", segment: "John", value: 100, count: 5 }, ...]
 * Output (simple): [{ name: "Open", value: 100, count: 5 }]
 * Output (segmented): [{ name: "Open", "John": 100, "Jane": 150, ... }] for stacked bars
 */
function adaptInsightToBarChart(data: any, definition: ReportDefinition) {
    if (!Array.isArray(data)) return [];

    // Check if data has segments
    const hasSegments = data.length > 0 && data[0].segment !== undefined;

    if (!hasSegments) {
        // Simple grouping - one dimension
        return data.map((item) => ({
            name: item.dimension || "Unknown",
            value: item.value || 0,
            count: item.count || 0,
        }));
    }

    // Segmented data - reshape for stacked bars
    // Group by dimension, then create properties for each segment
    const grouped = new Map<string, any>();

    data.forEach((item) => {
        const dimensionKey = item.dimension || "Unknown";
        const segmentKey = item.segment || "Unknown";

        if (!grouped.has(dimensionKey)) {
            grouped.set(dimensionKey, { name: dimensionKey });
        }

        const group = grouped.get(dimensionKey);
        group[segmentKey] = item.value || 0;
        group[`${segmentKey}_count`] = item.count || 0;
    });

    return Array.from(grouped.values());
}

/**
 * Historical → LineChart
 * Input (simple): [{ date: "2024-01-01", value: 100, count: 5 }, ...]
 * Input (segmented): [{ date: "2024-01-01", segment: "John", value: 100, count: 5 }, ...]
 * Output (simple): { periods: [{ period: "2024-01-01", value: 100, count: 5 }] }
 * Output (segmented): { periods: [{ period: "2024-01-01", "John": 100, "Jane": 150 }] } for multi-line
 */
function adaptHistoricalToLineChart(data: any, definition: ReportDefinition) {
    // Handle period comparison format
    if (data.current && Array.isArray(data.current)) {
        return {
            periods: data.current.map((item: any) => ({
                period: item.date,
                value: item.value || 0,
                count: item.count || 0,
                segment: item.segment,
            })),
            previousPeriods: data.previous ? data.previous.map((item: any) => ({
                period: item.date,
                value: item.value || 0,
                count: item.count || 0,
            })) : undefined,
            percentChange: data.percentChange,
        };
    }

    // Standard format
    if (!Array.isArray(data)) return { periods: [] };

    // Check if data has segments
    const hasSegments = data.length > 0 && data[0].segment !== undefined;

    if (!hasSegments) {
        // Simple time series - one line
        return {
            periods: data.map((item) => ({
                period: item.date,
                value: item.value || 0,
                count: item.count || 0,
            })),
        };
    }

    // Segmented data - reshape for multi-line chart
    // Group by date, then create properties for each segment
    const grouped = new Map<string, any>();

    data.forEach((item) => {
        const dateKey = item.date;
        const segmentKey = item.segment || "Unknown";

        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, { period: dateKey });
        }

        const group = grouped.get(dateKey);
        group[segmentKey] = item.value || 0;
        group[`${segmentKey}_count`] = item.count || 0;
    });

    return {
        periods: Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period)),
    };
}

/**
 * Funnel → FunnelWidget
 * Input: [{ stageId, stageName, count, conversionRate, dropOffRate }, ...]
 * Output: { stages: [{ stage, count, value, conversionRate }], summary: {...} }
 */
function adaptFunnelData(data: any) {
    if (!Array.isArray(data)) return { stages: [], summary: {} };

    const stages = data.map((item) => ({
        stage: item.stageName || item.stage,
        count: item.count || 0,
        value: item.value || 0,
        conversionRate: item.conversionRate || 0,
        dropOffRate: item.dropOffRate || 0,
    }));

    const summary = {
        totalEntered: stages[0]?.count || 0,
        totalConverted: stages[stages.length - 1]?.count || 0,
        overallConversionRate: stages[stages.length - 1]?.conversionRate || 0,
    };

    return { stages, summary };
}
