import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

// Export the Express app as a Vercel serverless function
// Vercel will automatically handle the conversion
export default app;
