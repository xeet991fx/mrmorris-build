/**
 * Cluster Mode - Utilizes multiple CPU cores
 *
 * For Railway: Set CLUSTER_WORKERS=2 (or desired vCores)
 * Falls back to single process if CLUSTER_WORKERS is not set
 */

import cluster from 'cluster';
import os from 'os';
import { logger } from './utils/logger';

const WORKERS = parseInt(process.env.CLUSTER_WORKERS || '1', 10);

if (cluster.isPrimary) {
    const numWorkers = Math.min(WORKERS, os.cpus().length);

    logger.info(`Primary process ${process.pid} starting ${numWorkers} workers`);

    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    // Handle worker crashes - restart them
    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        cluster.fork();
    });

    cluster.on('online', (worker) => {
        logger.info(`Worker ${worker.process.pid} is online`);
    });

} else {
    // Worker processes run the actual server
    import('./server');
}
