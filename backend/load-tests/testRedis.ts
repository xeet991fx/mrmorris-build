
import dotenv from 'dotenv';
import Redis from 'ioredis';

// Load env
dotenv.config();

const run = async () => {
    try {
        console.log("Connecting to Redis...");
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379');

        console.log(`Target: ${host}:${port}`);

        const client = new Redis({
            host,
            port,
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: () => null // Fail fast for test
        });

        client.on('error', (err) => {
            console.error("Redis Client Error:", err.message);
            // Don't exit immediately, let the logic fail
        });

        console.log("Sending SET command...");
        await client.set('test-key', 'Hello Redis from Test Script');

        console.log("Sending GET command...");
        const value = await client.get('test-key');

        console.log(`GET result: "${value}"`);

        console.log("Sending PING command...");
        const ping = await client.ping();
        console.log(`PING result: ${ping}`);

        await client.quit();
        console.log("Redis test passed!");
        process.exit(0);
    } catch (e) {
        console.error("Test Failed:", e);
        process.exit(1);
    }
};

run();
