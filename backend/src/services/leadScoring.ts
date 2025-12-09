/**
 * Lead Scoring Service
 *
 * Manages lead scoring logic including point assignment,
 * automatic scoring rules, and workflow integration.
 */

import { Types } from "mongoose";
import LeadScore from "../models/LeadScore";
import Contact from "../models/Contact";
import { workflowService } from "./workflow";

// ============================================
// SCORING RULES
// ============================================

/**
 * Default scoring rules
 * Customize these based on your business needs
 */
export const SCORING_RULES: Record<string, number> = {
    // Email Engagement
    email_opened: 5,
    email_clicked: 10,
    email_replied: 15,
    email_bounced: -10,
    email_unsubscribed: -50,

    // Website Activity
    page_visited: 3,
    blog_read: 5,
    pricing_page_viewed: 15,
    demo_video_watched: 20,

    // Forms & Downloads
    form_submitted: 20,
    whitepaper_downloaded: 15,
    ebook_downloaded: 15,
    webinar_registered: 25,
    webinar_attended: 30,

    // Direct Engagement
    demo_requested: 50,
    call_scheduled: 40,
    meeting_attended: 35,
    phone_call_answered: 20,

    // Deal Activity
    deal_created: 50,
    deal_stage_advanced: 25,
    deal_won: 100,
    deal_lost: -30,

    // Social Engagement
    linkedin_connection: 10,
    social_share: 8,
    social_comment: 12,

    // Negative Signals
    no_activity_30_days: -10,
    no_activity_60_days: -20,
    no_activity_90_days: -30,
    complaint_filed: -40,
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Update lead score based on activity
 */
export async function updateLeadScore(
    workspaceId: string | Types.ObjectId,
    contactId: string | Types.ObjectId,
    eventType: string,
    metadata?: Record<string, any>
): Promise<{ score: number; grade: string; scoreChange: number; gradeChange: boolean }> {
    // Get or create lead score
    const leadScore = await LeadScore.getOrCreate(workspaceId, contactId);

    // Get points for this event
    const points = SCORING_RULES[eventType] || 0;

    if (points === 0) {
        console.log(`No scoring rule for event: ${eventType}`);
        return {
            score: leadScore.currentScore,
            grade: leadScore.grade,
            scoreChange: 0,
            gradeChange: false,
        };
    }

    const previousGrade = leadScore.grade;

    // Add points
    await leadScore.addPoints(
        eventType,
        points,
        getEventDescription(eventType),
        metadata
    );

    const scoreChange = points;
    const gradeChange = leadScore.grade !== previousGrade;

    console.log(
        `📊 Lead score updated: contact=${contactId}, event=${eventType}, points=${points > 0 ? "+" : ""}${points}, score=${leadScore.currentScore}, grade=${leadScore.grade}`
    );

    // Check if we should trigger workflows
    await checkScoreThresholds(workspaceId, contactId, leadScore);

    return {
        score: leadScore.currentScore,
        grade: leadScore.grade,
        scoreChange,
        gradeChange,
    };
}

/**
 * Manually set lead score
 */
export async function setLeadScore(
    workspaceId: string | Types.ObjectId,
    contactId: string | Types.ObjectId,
    score: number,
    reason: string = "Manual update"
): Promise<void> {
    const leadScore = await LeadScore.getOrCreate(workspaceId, contactId);

    const points = score - leadScore.currentScore;

    await leadScore.addPoints("manual_update", points, reason);

    console.log(`📝 Lead score set manually: contact=${contactId}, score=${score}`);
}

/**
 * Get lead score for a contact
 */
export async function getLeadScore(
    workspaceId: string | Types.ObjectId,
    contactId: string | Types.ObjectId
): Promise<{ score: number; grade: string; history: any[] } | null> {
    const leadScore = await LeadScore.findOne({ workspaceId, contactId });

    if (!leadScore) {
        return null;
    }

    return {
        score: leadScore.currentScore,
        grade: leadScore.grade,
        history: leadScore.scoreHistory,
    };
}

/**
 * Apply decay to all inactive leads
 */
export async function applyScoreDecay(
    workspaceId: string | Types.ObjectId,
    daysInactive: number = 30,
    decayPercent: number = 10
): Promise<number> {
    console.log(
        `🕒 Applying score decay: workspace=${workspaceId}, daysInactive=${daysInactive}, decay=${decayPercent}%`
    );

    const decayedCount = await LeadScore.applyDecay(
        workspaceId,
        daysInactive,
        decayPercent
    );

    console.log(`✅ Decayed ${decayedCount} lead scores`);

    return decayedCount;
}

/**
 * Get leaderboard of top scored leads
 */
export async function getTopLeads(
    workspaceId: string | Types.ObjectId,
    limit: number = 10
): Promise<any[]> {
    return LeadScore.getTopLeads(workspaceId, limit);
}

/**
 * Get score distribution by grade
 */
export async function getScoreDistribution(
    workspaceId: string | Types.ObjectId
): Promise<Record<string, number>> {
    const distribution = await LeadScore.aggregate([
        { $match: { workspaceId: new Types.ObjectId(workspaceId as string) } },
        { $group: { _id: "$grade", count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0,
    };

    distribution.forEach((item) => {
        result[item._id] = item.count;
    });

    return result;
}

// ============================================
// WORKFLOW INTEGRATION
// ============================================

/**
 * Check if score thresholds are met and trigger workflows
 */
async function checkScoreThresholds(
    workspaceId: string | Types.ObjectId,
    contactId: string | Types.ObjectId,
    leadScore: any
): Promise<void> {
    const contact = await Contact.findById(contactId);
    if (!contact) return;

    // Score increased significantly (>= 50 points)
    if (leadScore.currentScore >= 50 && leadScore.previousScore < 50) {
        await workflowService.checkAndEnroll(
            "lead_score_threshold",
            contact,
            workspaceId.toString()
        );
    }

    // Grade changed
    if (leadScore.grade !== leadScore.previousGrade) {
        await workflowService.checkAndEnroll(
            "lead_grade_changed",
            contact,
            workspaceId.toString()
        );
    }

    // Hot lead (A grade)
    if (leadScore.grade === "A" && leadScore.previousGrade !== "A") {
        await workflowService.checkAndEnroll(
            "lead_hot",
            contact,
            workspaceId.toString()
        );
    }

    // Cold lead (D or F grade)
    if (
        (leadScore.grade === "D" || leadScore.grade === "F") &&
        leadScore.previousGrade !== "D" &&
        leadScore.previousGrade !== "F"
    ) {
        await workflowService.checkAndEnroll(
            "lead_cold",
            contact,
            workspaceId.toString()
        );
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get human-readable description for event type
 */
function getEventDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
        email_opened: "Opened email",
        email_clicked: "Clicked link in email",
        email_replied: "Replied to email",
        email_bounced: "Email bounced",
        email_unsubscribed: "Unsubscribed from emails",
        page_visited: "Visited website",
        blog_read: "Read blog post",
        pricing_page_viewed: "Viewed pricing page",
        demo_video_watched: "Watched demo video",
        form_submitted: "Submitted form",
        whitepaper_downloaded: "Downloaded whitepaper",
        ebook_downloaded: "Downloaded ebook",
        webinar_registered: "Registered for webinar",
        webinar_attended: "Attended webinar",
        demo_requested: "Requested demo",
        call_scheduled: "Scheduled call",
        meeting_attended: "Attended meeting",
        phone_call_answered: "Answered phone call",
        deal_created: "Deal created",
        deal_stage_advanced: "Deal stage advanced",
        deal_won: "Deal won",
        deal_lost: "Deal lost",
        linkedin_connection: "Connected on LinkedIn",
        social_share: "Shared on social media",
        social_comment: "Commented on social post",
        no_activity_30_days: "No activity for 30 days",
        no_activity_60_days: "No activity for 60 days",
        no_activity_90_days: "No activity for 90 days",
        complaint_filed: "Filed complaint",
        manual_update: "Manual score update",
    };

    return descriptions[eventType] || eventType;
}

/**
 * Get recommended actions based on lead score
 */
export function getRecommendedActions(score: number, grade: string): string[] {
    if (grade === "A") {
        return [
            "Schedule sales call immediately",
            "Send personalized demo invite",
            "Assign to senior sales rep",
            "Add to high-priority follow-up list",
        ];
    }

    if (grade === "B") {
        return [
            "Send case study or success story",
            "Invite to product webinar",
            "Offer free trial or demo",
            "Add to nurture sequence",
        ];
    }

    if (grade === "C") {
        return [
            "Send educational content",
            "Invite to webinar or event",
            "Share relevant blog posts",
            "Continue nurture campaign",
        ];
    }

    if (grade === "D" || grade === "F") {
        return [
            "Send re-engagement email",
            "Offer special promotion",
            "Ask for feedback",
            "Consider removing from active list",
        ];
    }

    return [];
}

export default {
    updateLeadScore,
    setLeadScore,
    getLeadScore,
    applyScoreDecay,
    getTopLeads,
    getScoreDistribution,
    getRecommendedActions,
    SCORING_RULES,
};
