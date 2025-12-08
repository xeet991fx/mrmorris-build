import type { VercelRequest, VercelResponse } from '@vercel/node';
import connectDB from '../../backend/src/config/database';
import workflowService from '../../backend/src/services/WorkflowService';

/**
 * Vercel Cron Job Handler for Workflow Processing
 * 
 * This endpoint is called by Vercel Cron every minute to process
 * workflow enrollments that are ready for execution.
 * 
 * @route GET /api/cron/workflows
 * @access Protected by CRON_SECRET
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow GET requests (Vercel Cron uses GET)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify the request is from Vercel Cron
    // In production, Vercel automatically adds this header
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('❌ Unauthorized cron request');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔄 Cron job triggered: Processing workflow enrollments...');
    const startTime = Date.now();

    try {
        // Connect to database
        await connectDB();

        // Process ready enrollments
        await workflowService.processReadyEnrollments();

        const duration = Date.now() - startTime;
        console.log(`✅ Workflow cron completed in ${duration}ms`);

        return res.status(200).json({
            success: true,
            message: 'Workflow enrollments processed successfully',
            timestamp: new Date().toISOString(),
            durationMs: duration,
        });
    } catch (error: any) {
        console.error('❌ Cron job error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process workflow enrollments',
            message: error.message,
        });
    }
}
