/**
 * Form Analytics Service
 *
 * Calculates real-time analytics for forms:
 * - Field completion rates
 * - Average time to complete
 * - Abandonment rates
 * - Conversion funnels
 */

import Form from "../models/Form";
import FormSubmission from "../models/FormSubmission";
import { Types } from "mongoose";

interface FieldAnalytics {
    fieldId: string;
    fieldLabel: string;
    completionRate: number;
    totalResponses: number;
    uniqueValues?: number;
    topValues?: Array<{ value: string; count: number }>;
}

interface FormAnalytics {
    totalViews: number;
    totalSubmissions: number;
    conversionRate: number;
    averageTimeToComplete?: number;
    abandonmentRate: number;
    submissionsByDay: Array<{ date: string; count: number }>;
    fieldAnalytics: FieldAnalytics[];
    lastUpdated: Date;
}

/**
 * Calculate real analytics for a form
 */
export async function calculateFormAnalytics(
    workspaceId: string | Types.ObjectId,
    formId: string | Types.ObjectId
): Promise<FormAnalytics> {
    const form = await Form.findOne({ _id: formId, workspaceId });

    if (!form) {
        throw new Error("Form not found");
    }

    // Get all submissions
    const submissions = await FormSubmission.find({ formId }).lean();

    // Basic metrics
    const totalViews = form.stats.views || 0;
    const totalSubmissions = submissions.length;
    const conversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;

    // Calculate submissions by day (last 30 days)
    const submissionsByDay = calculateSubmissionsByDay(submissions);

    // Calculate field-level analytics
    const fieldAnalytics = calculateFieldAnalytics(form.fields, submissions);

    // Calculate abandonment rate (simplified - views with no submission)
    const abandonmentRate = totalViews > 0 ? ((totalViews - totalSubmissions) / totalViews) * 100 : 0;

    return {
        totalViews,
        totalSubmissions,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        abandonmentRate: parseFloat(abandonmentRate.toFixed(2)),
        submissionsByDay,
        fieldAnalytics,
        lastUpdated: new Date(),
    };
}

/**
 * Calculate submissions grouped by day
 */
function calculateSubmissionsByDay(
    submissions: any[]
): Array<{ date: string; count: number }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
    });

    const submissionCounts = new Map<string, number>();

    // Initialize all days with 0
    last30Days.forEach(date => submissionCounts.set(date, 0));

    // Count submissions
    submissions.forEach(submission => {
        const date = new Date(submission.createdAt).toISOString().split('T')[0];
        if (submissionCounts.has(date)) {
            submissionCounts.set(date, (submissionCounts.get(date) || 0) + 1);
        }
    });

    return last30Days.map(date => ({
        date,
        count: submissionCounts.get(date) || 0,
    }));
}

/**
 * Calculate analytics for each field
 */
function calculateFieldAnalytics(
    fields: any[],
    submissions: any[]
): FieldAnalytics[] {
    return fields.map(field => {
        const fieldId = field.id;
        const fieldLabel = field.label;

        // Count how many submissions have this field filled
        const responsesWithField = submissions.filter(
            sub => sub.data[fieldId] !== undefined && sub.data[fieldId] !== null && sub.data[fieldId] !== ''
        );

        const totalResponses = responsesWithField.length;
        const completionRate = submissions.length > 0
            ? (totalResponses / submissions.length) * 100
            : 0;

        // For select/radio fields, calculate top values
        let topValues: Array<{ value: string; count: number }> | undefined;
        let uniqueValues: number | undefined;

        if (['select', 'radio', 'checkbox', 'multiselect'].includes(field.type)) {
            const valueCounts = new Map<string, number>();

            responsesWithField.forEach(sub => {
                const value = String(sub.data[fieldId]);
                valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
            });

            uniqueValues = valueCounts.size;

            topValues = Array.from(valueCounts.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5); // Top 5 values
        }

        return {
            fieldId,
            fieldLabel,
            completionRate: parseFloat(completionRate.toFixed(2)),
            totalResponses,
            uniqueValues,
            topValues,
        };
    });
}

/**
 * Get analytics for a specific time range
 */
export async function getFormAnalyticsByDateRange(
    workspaceId: string | Types.ObjectId,
    formId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
): Promise<FormAnalytics> {
    const form = await Form.findOne({ _id: formId, workspaceId });

    if (!form) {
        throw new Error("Form not found");
    }

    // Get submissions within date range
    const submissions = await FormSubmission.find({
        formId,
        createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const totalSubmissions = submissions.length;
    const totalViews = form.stats.views || 0; // Views aren't date-ranged in current implementation

    return {
        totalViews,
        totalSubmissions,
        conversionRate: totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0,
        abandonmentRate: totalViews > 0 ? ((totalViews - totalSubmissions) / totalViews) * 100 : 0,
        submissionsByDay: calculateSubmissionsByDay(submissions),
        fieldAnalytics: calculateFieldAnalytics(form.fields, submissions),
        lastUpdated: new Date(),
    };
}

/**
 * Update form stats with latest analytics
 * Should be called periodically or on each submission
 */
export async function updateFormStats(formId: string | Types.ObjectId): Promise<void> {
    const form = await Form.findById(formId);
    if (!form) return;

    const submissions = await FormSubmission.find({ formId }).lean();

    // Update conversion rate
    if (form.stats.views > 0) {
        form.stats.conversionRate = (submissions.length / form.stats.views) * 100;
    }

    // Calculate field stats
    const fieldStats = calculateFieldAnalytics(form.fields, submissions);
    form.stats.fieldStats = fieldStats.map(stat => ({
        fieldId: stat.fieldId,
        completionRate: stat.completionRate,
        averageTime: 0, // Would need timing data to calculate
    }));

    // Update abandonment rate
    form.stats.abandonmentRate = form.stats.views > 0
        ? ((form.stats.views - submissions.length) / form.stats.views) * 100
        : 0;

    await form.save();
}
