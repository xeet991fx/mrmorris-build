/**
 * Proactive AI Jobs Index
 * 
 * Exports all proactive AI job starters for easy initialization.
 */

export { startMeetingPrepJob, meetingPrepQueue, meetingPrepWorker } from './meetingPrepJob';
export { startStaleDealAlertJob, staleDealQueue, staleDealWorker } from './staleDealAlertJob';
export { startDailyInsightJob, dailyInsightQueue, dailyInsightWorker } from './dailyInsightJob';

/**
 * Initialize all proactive AI jobs
 */
export async function initializeProactiveAIJobs(): Promise<void> {
    console.log('🤖 Initializing proactive AI jobs...');

    const { startMeetingPrepJob } = await import('./meetingPrepJob');
    const { startStaleDealAlertJob } = await import('./staleDealAlertJob');
    const { startDailyInsightJob } = await import('./dailyInsightJob');

    await Promise.all([
        startMeetingPrepJob(),
        startStaleDealAlertJob(),
        startDailyInsightJob(),
    ]);

    console.log('✅ Proactive AI jobs initialized');
}
