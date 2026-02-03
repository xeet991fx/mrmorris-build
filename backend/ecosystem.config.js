/**
 * PM2 Ecosystem Configuration
 *
 * Railway Trial: 2 vCores
 * - 2 workers for load distribution
 * - Auto-restart on crash
 * - Memory limit per instance
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 */

module.exports = {
    apps: [
        {
            name: "morrisB-api",
            script: "./dist/server.js",

            // Cluster mode: 2 instances for Railway trial (2 vCores)
            instances: process.env.NODE_ENV === "production" ? 2 : 4,
            exec_mode: "cluster",

            // Auto-restart configuration
            watch: false,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 1000,

            // Memory management (500MB per instance for 2 vCore Railway)
            max_memory_restart: "500M",

            // Environment variables
            env: {
                NODE_ENV: "development",
                PORT: 5000,
            },
            env_production: {
                NODE_ENV: "production",
                PORT: process.env.PORT || 5000,
            },

            // Logging
            log_file: "./logs/combined.log",
            out_file: "./logs/out.log",
            error_file: "./logs/error.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs: true,

            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,

            // Node.js options
            node_args: "--max-old-space-size=450",
        },
    ],
};
