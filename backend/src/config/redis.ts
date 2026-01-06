import { Redis } from 'ioredis';

// Singleton Redis connection
let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    // Support both REDIS_URL (Railway, Heroku, etc.) and individual params (local)
    if (process.env.REDIS_URL) {
      // Production: Use REDIS_URL connection string
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy(times: number) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err: Error) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });
    } else {
      // Local development: Use individual connection parameters
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
        retryStrategy(times: number) {
          // Stop retrying after 3 attempts for local dev
          if (times > 3) {
            console.log('⚠️  Redis unavailable - Queue features disabled. Install Redis or use Upstash cloud Redis.');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 1000);
        },
        reconnectOnError(err: Error) {
          // Don't reconnect on errors in development
          return false;
        },
      });
    }

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    let errorLogged = false;
    redisClient.on('error', (err) => {
      // Only log the first error to avoid spam
      if (!errorLogged && (err as any).code === 'ECONNREFUSED') {
        console.error('⚠️  Redis connection failed - Queue features disabled');
        console.log('💡 To enable queues: Install Redis locally or use Upstash cloud Redis (see .env file)');
        errorLogged = true;
      } else if ((err as any).code !== 'ECONNREFUSED') {
        console.error('❌ Redis error:', err.message);
      }
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis ready for operations');
    });
  }

  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('🔌 Redis connection closed');
  }
};

export default getRedisClient;
