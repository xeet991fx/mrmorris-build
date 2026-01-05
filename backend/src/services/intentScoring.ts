/**
 * Intent Scoring Service
 *
 * Tracks and scores behavioral signals that indicate buying intent.
 * Identifies hot leads based on behavior patterns.
 */

import { Types } from "mongoose";
import IntentSignal from "../models/IntentSignal";
import Contact from "../models/Contact";
import Visitor from "../models/Visitor";

// ============================================
// INTENT SIGNAL SCORING RULES
// ============================================

/**
 * Define intent scores for different signals
 * Higher score = stronger buying intent
 */
export const INTENT_SIGNALS: Record<string, { score: number; description: string }> = {
    // High-Intent Pages
    'pricing_page': { score: 25, description: 'Viewed pricing page' },
    'pricing_page_repeated': { score: 50, description: 'Viewed pricing 3+ times' },
    'demo_request_page': { score: 40, description: 'Visited demo request page' },
    'contact_page': { score: 20, description: 'Visited contact page' },
    'booking_page': { score: 45, description: 'Visited booking/calendar page' },

    // Content Engagement
    'case_study_view': { score: 15, description: 'Read case study' },
    'case_study_download': { score: 30, description: 'Downloaded case study' },
    'whitepaper_download': { score: 35, description: 'Downloaded whitepaper' },
    'ebook_download': { score: 30, description: 'Downloaded ebook' },
    'product_comparison': { score: 25, description: 'Viewed product comparison' },

    // Video Engagement
    'demo_video_started': { score: 15, description: 'Started watching demo video' },
    'demo_video_50': { score: 25, description: 'Watched 50% of demo video' },
    'demo_video_completed': { score: 40, description: 'Watched full demo video' },
    'webinar_registered': { score: 35, description: 'Registered for webinar' },
    'webinar_attended': { score: 50, description: 'Attended webinar' },

    // Email Engagement
    'email_link_clicked': { score: 10, description: 'Clicked link in email' },
    'pricing_email_clicked': { score: 30, description: 'Clicked pricing link in email' },
    'demo_email_clicked': { score: 35, description: 'Clicked demo link in email' },

    // Search Signals
    'search_pricing': { score: 20, description: 'Searched for pricing' },
    'search_features': { score: 15, description: 'Searched for features' },
    'search_integration': { score: 18, description: 'Searched for integrations' },

    // Form Interactions
    'form_viewed': { score: 5, description: 'Viewed form' },
    'form_started': { score: 15, description: 'Started filling form' },
    'form_abandoned': { score: 10, description: 'Abandoned form (still interested)' },
    'form_submitted': { score: 40, description: 'Submitted form' },

    // Product Exploration
    'features_page_deep': { score: 12, description: 'Explored features in-depth' },
    'documentation_view': { score: 10, description: 'Viewed documentation' },
    'api_docs_view': { score: 15, description: 'Viewed API documentation' },
    'integrations_page': { score: 12, description: 'Viewed integrations page' },

    // Competitive Research
    'competitors_page': { score: 20, description: 'Viewed competitors comparison' },
    'roi_calculator': { score: 30, description: 'Used ROI calculator' },

    // Time-based signals
    'extended_session': { score: 15, description: 'Spent 10+ minutes on site' },
    'multiple_visits_day': { score: 20, description: 'Visited 3+ times in one day' },
    'multiple_visits_week': { score: 10, description: 'Visited 5+ times this week' },
};

// ============================================
// INTENT PATTERNS (Multiple signals)
// ============================================

export interface IntentPattern {
    name: string;
    description: string;
    signals: string[];
    bonusScore: number; // Extra points if pattern is detected
    timeWindow: number; // Hours within which signals must occur
}

export const INTENT_PATTERNS: IntentPattern[] = [
    {
        name: 'demo_seeker',
        description: 'Actively seeking demo',
        signals: ['pricing_page', 'demo_video_completed', 'case_study_view'],
        bonusScore: 30,
        timeWindow: 24,
    },
    {
        name: 'comparison_shopper',
        description: 'Comparing vendors',
        signals: ['competitors_page', 'pricing_page', 'features_page_deep'],
        bonusScore: 25,
        timeWindow: 48,
    },
    {
        name: 'ready_to_buy',
        description: 'Strong buying intent',
        signals: ['pricing_page_repeated', 'demo_video_completed', 'form_submitted'],
        bonusScore: 50,
        timeWindow: 72,
    },
    {
        name: 'technical_evaluator',
        description: 'Technical decision maker',
        signals: ['api_docs_view', 'documentation_view', 'integrations_page'],
        bonusScore: 20,
        timeWindow: 168, // 1 week
    },
    {
        name: 'content_consumer',
        description: 'Researching solution',
        signals: ['case_study_download', 'whitepaper_download', 'webinar_attended'],
        bonusScore: 25,
        timeWindow: 168,
    },
];

// ============================================
// DECAY CONFIGURATION
// ============================================

/**
 * Intent score decay settings
 * Exponential decay: score = originalScore * (0.5 ^ (daysSince / halfLife))
 */
export const DECAY_CONFIG = {
    HALF_LIFE_DAYS: 30, // Score halves every 30 days
    MAX_AGE_DAYS: 90,   // Signals older than 90 days are ignored
};

/**
 * Apply time-based decay to a signal score
 */
export function applyDecay(originalScore: number, signalTimestamp: Date): number {
    const now = Date.now();
    const signalTime = new Date(signalTimestamp).getTime();
    const ageInMs = now - signalTime;
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    // Ignore very old signals
    if (ageInDays > DECAY_CONFIG.MAX_AGE_DAYS) {
        return 0;
    }

    // Exponential decay: score * (0.5 ^ (age / halfLife))
    const decayFactor = Math.pow(0.5, ageInDays / DECAY_CONFIG.HALF_LIFE_DAYS);
    const decayedScore = originalScore * decayFactor;

    return Math.round(decayedScore * 100) / 100; // Round to 2 decimals
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Track an intent signal
 */
export async function trackIntentSignal(
    workspaceId: string | Types.ObjectId,
    signalName: string,
    data: {
        contactId?: string | Types.ObjectId;
        visitorId?: string;
        signalType?: 'page_view' | 'download' | 'video_watch' | 'form_view' | 'email_click' | 'search' | 'custom';
        url?: string;
        pageTitle?: string;
        sessionId?: string;
        source?: string;
        metadata?: any;
    }
): Promise<{ intentScore: number; totalScore: number; patterns: string[] }> {

    // Get signal score
    const signalConfig = INTENT_SIGNALS[signalName];
    if (!signalConfig) {
        console.warn(`Unknown intent signal: ${signalName}`);
        return { intentScore: 0, totalScore: 0, patterns: [] };
    }

    // Create signal record
    await IntentSignal.create({
        workspaceId,
        contactId: data.contactId,
        visitorId: data.visitorId,
        signalType: data.signalType || 'page_view',
        signalName,
        signalValue: signalConfig.score,
        url: data.url,
        pageTitle: data.pageTitle,
        sessionId: data.sessionId,
        source: data.source,
        metadata: data.metadata,
        timestamp: new Date(),
    });

    console.log(`📊 Intent signal tracked: ${signalName} (+${signalConfig.score} points)`);

    // Calculate total intent score
    const result = await calculateIntentScore(workspaceId, data.contactId, data.visitorId);

    return result;
}

/**
 * Calculate total intent score for a contact/visitor
 */
export async function calculateIntentScore(
    workspaceId: string | Types.ObjectId,
    contactId?: string | Types.ObjectId,
    visitorId?: string
): Promise<{ intentScore: number; totalScore: number; patterns: string[]; signals: any[] }> {

    if (!contactId && !visitorId) {
        throw new Error("Either contactId or visitorId is required");
    }

    // Get signals from last MAX_AGE_DAYS (90 days by default)
    const maxAgeDate = new Date();
    maxAgeDate.setDate(maxAgeDate.getDate() - DECAY_CONFIG.MAX_AGE_DAYS);

    const filter: any = {
        workspaceId,
        timestamp: { $gte: maxAgeDate },
    };

    if (contactId) {
        filter.contactId = contactId;
    } else {
        filter.visitorId = visitorId;
    }

    const signals = await IntentSignal.find(filter)
        .sort({ timestamp: -1 })
        .lean();

    // Calculate base score with time-based decay
    let baseScore = 0;
    const signalSummary: any[] = [];

    for (const signal of signals) {
        // Apply exponential decay based on signal age
        const decayedScore = applyDecay(signal.signalValue, signal.timestamp);
        baseScore += decayedScore;

        signalSummary.push({
            name: signal.signalName,
            originalScore: signal.signalValue,
            decayedScore: decayedScore,
            timestamp: signal.timestamp,
        });
    }

    // Detect patterns
    const detectedPatterns = detectIntentPatterns(signals);
    let patternBonus = 0;

    for (const pattern of detectedPatterns) {
        patternBonus += pattern.bonusScore;
    }

    const totalScore = baseScore + patternBonus;

    console.log(`
    📈 Intent Score Calculated (with time-based decay)
    Base Score (decayed): ${Math.round(baseScore * 100) / 100}
    Pattern Bonus: +${patternBonus}
    Total Score: ${Math.round(totalScore * 100) / 100}
    Patterns: ${detectedPatterns.map(p => p.name).join(', ') || 'None'}
    Signals: ${signals.length} in last ${DECAY_CONFIG.MAX_AGE_DAYS} days
    `);

    // Update contact with intent score
    if (contactId) {
        await Contact.findByIdAndUpdate(contactId, {
            intentScore: totalScore,
            intentUpdatedAt: new Date(),
        });
    }

    return {
        intentScore: baseScore,
        totalScore,
        patterns: detectedPatterns.map(p => p.name),
        signals: signalSummary,
    };
}

/**
 * Detect intent patterns
 */
function detectIntentPatterns(signals: any[]): IntentPattern[] {
    const detectedPatterns: IntentPattern[] = [];

    for (const pattern of INTENT_PATTERNS) {
        const now = Date.now();
        const windowMs = pattern.timeWindow * 60 * 60 * 1000;

        // Get signals within time window
        const recentSignals = signals.filter(s => {
            const signalTime = new Date(s.timestamp).getTime();
            return now - signalTime <= windowMs;
        });

        // Check if all required signals are present
        const hasAllSignals = pattern.signals.every(requiredSignal =>
            recentSignals.some(s => s.signalName === requiredSignal)
        );

        if (hasAllSignals) {
            detectedPatterns.push(pattern);
        }
    }

    return detectedPatterns;
}

/**
 * Get hot leads based on intent score
 */
export async function getHotLeads(
    workspaceId: string | Types.ObjectId,
    minIntentScore: number = 100,
    limit: number = 50
): Promise<any[]> {

    // Get contacts with high intent scores
    const hotContacts = await Contact.find({
        workspaceId,
        intentScore: { $gte: minIntentScore },
    })
        .sort({ intentScore: -1 })
        .limit(limit)
        .populate('companyId')
        .lean();

    // Enrich with recent signals
    const enrichedLeads = [];

    for (const contact of hotContacts) {
        const recentSignals = await IntentSignal.find({
            contactId: contact._id,
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
        })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();

        enrichedLeads.push({
            ...contact,
            recentActivity: recentSignals.map(s => ({
                signal: s.signalName,
                description: INTENT_SIGNALS[s.signalName]?.description || s.signalName,
                score: s.signalValue,
                timestamp: s.timestamp,
            })),
        });
    }

    return enrichedLeads;
}

/**
 * Get intent breakdown for a contact
 */
export async function getContactIntentBreakdown(
    contactId: string | Types.ObjectId,
    days: number = 30
): Promise<{
    totalScore: number;
    signalsByType: Record<string, number>;
    recentSignals: any[];
    patterns: string[];
    timeline: any[];
}> {

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const signals = await IntentSignal.find({
        contactId,
        timestamp: { $gte: startDate },
    })
        .sort({ timestamp: -1 })
        .lean();

    // Group by signal type with decay applied
    const signalsByType: Record<string, number> = {};
    let totalScore = 0;

    for (const signal of signals) {
        const decayedScore = applyDecay(signal.signalValue, signal.timestamp);
        totalScore += decayedScore;

        if (!signalsByType[signal.signalType]) {
            signalsByType[signal.signalType] = 0;
        }
        signalsByType[signal.signalType] += decayedScore;
    }

    // Get recent signals (last 10) with decay information
    const recentSignals = signals.slice(0, 10).map(s => ({
        name: s.signalName,
        description: INTENT_SIGNALS[s.signalName]?.description || s.signalName,
        originalScore: s.signalValue,
        decayedScore: applyDecay(s.signalValue, s.timestamp),
        timestamp: s.timestamp,
        url: s.url,
    }));

    // Detect patterns
    const detectedPatterns = detectIntentPatterns(signals);

    // Create timeline (group by day) with decay applied
    const timeline: Record<string, number> = {};
    for (const signal of signals) {
        const day = signal.timestamp.toISOString().split('T')[0];
        if (!timeline[day]) {
            timeline[day] = 0;
        }
        const decayedScore = applyDecay(signal.signalValue, signal.timestamp);
        timeline[day] += decayedScore;
    }

    const timelineArray = Object.entries(timeline).map(([date, score]) => ({
        date,
        score,
    }));

    return {
        totalScore,
        signalsByType,
        recentSignals,
        patterns: detectedPatterns.map(p => p.name),
        timeline: timelineArray,
    };
}

/**
 * Track pricing page views (special case - frequent viewing = hot lead)
 */
export async function trackPricingPageView(
    workspaceId: string | Types.ObjectId,
    contactId: string | Types.ObjectId,
    sessionId: string
): Promise<{ isHotLead: boolean; viewCount: number }> {

    // Check how many times they viewed pricing in last 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentViews = await IntentSignal.countDocuments({
        workspaceId,
        contactId,
        signalName: { $in: ['pricing_page', 'pricing_page_repeated'] },
        timestamp: { $gte: yesterday },
    });

    // Track signal
    let signalName = 'pricing_page';
    if (recentViews >= 2) {
        signalName = 'pricing_page_repeated';
    }

    await trackIntentSignal(workspaceId, signalName, {
        contactId,
        signalType: 'page_view',
        sessionId,
    });

    return {
        isHotLead: recentViews >= 3,
        viewCount: recentViews + 1,
    };
}

export default {
    trackIntentSignal,
    calculateIntentScore,
    getHotLeads,
    getContactIntentBreakdown,
    trackPricingPageView,
    applyDecay,
    INTENT_SIGNALS,
    INTENT_PATTERNS,
    DECAY_CONFIG,
};
