
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Schema } from 'mongoose';

// Load env
dotenv.config();

// Minimal Schemas
const UserSchema = new Schema({}, { strict: false });
const ProjectSchema = new Schema({ userId: Schema.Types.ObjectId }, { strict: false });

const User = (mongoose.models.User || mongoose.model('User', UserSchema)) as any;
const Project = (mongoose.models.Project || mongoose.model('Project', ProjectSchema)) as any;

const createContact = (i: number) => ({
    firstName: `LoadTest${i}`,
    lastName: 'User',
    email: `loadtest-${Date.now()}-${i}@gmail.com`,
    jobTitle: 'Tester',
    company: 'LoadTest Inc'
});

const run = async () => {
    try {
        console.log("Initializing Heavy Load Test...");
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");

        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Get User
        const user = await User.findOne({}) as any;
        if (!user) throw new Error("No user found");

        // 2. Get Workspace for User
        const project = await Project.findOne({ userId: user._id }) as any;
        if (!project) throw new Error("No project/workspace found for user");

        // 3. Generate Token
        const secret = process.env.JWT_SECRET || "dev-only-secret-do-not-use-in-production";
        const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });

        console.log(`User: ${user._id}`);
        console.log(`Workspace: ${project._id}`);

        const BASE_URL = "http://localhost:5000/api";
        const TOTAL_REQUESTS = 500; // 500 requests
        const CONCURRENCY = 20;     // 20 concurrent

        const stats = {
            authMe: { count: 0, latencies: [] as number[], errors: 0 },
            getContacts: { count: 0, latencies: [] as number[], errors: 0 },
            createContact: { count: 0, latencies: [] as number[], errors: 0 }
        };

        let completed = 0;

        const executeRequest = async (i: number) => {
            const rand = Math.random();
            let type = '';
            let url = '';
            let nOptions: any = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (rand < 0.5) {
                type = 'authMe';
                url = `${BASE_URL}/auth/me`;
                nOptions.method = 'GET';
            } else if (rand < 0.8) {
                type = 'getContacts';
                url = `${BASE_URL}/workspaces/${project._id}/contacts?limit=5`;
                nOptions.method = 'GET';
            } else {
                type = 'createContact';
                url = `${BASE_URL}/workspaces/${project._id}/contacts`;
                nOptions.method = 'POST';
                nOptions.body = JSON.stringify(createContact(i));
            }

            const start = performance.now();
            try {
                const res = await fetch(url, nOptions);
                const duration = performance.now() - start;

                if (res.ok) {
                    (stats as any)[type].latencies.push(duration);
                    (stats as any)[type].count++;
                } else {
                    (stats as any)[type].errors++;
                    // console.error(`${type} failed: ${res.status}`);
                }
            } catch (e) {
                (stats as any)[type].errors++;
                console.error(e);
            }

            completed++;
            if (completed % 50 === 0) process.stdout.write(`.`);
        };

        console.log(`Starting ${TOTAL_REQUESTS} requests with concurrency ${CONCURRENCY}...`);
        // Simple batching
        const batches = [];
        for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
            const batch = [];
            for (let j = 0; j < CONCURRENCY && (i + j) < TOTAL_REQUESTS; j++) {
                batch.push(executeRequest(i + j));
            }
            await Promise.all(batch);
        }

        console.log("\n\nTest Complete. Results:");

        const printStat = (name: string, stat: any) => {
            const avg = stat.latencies.length ? (stat.latencies.reduce((a: any, b: any) => a + b, 0) / stat.latencies.length).toFixed(2) : 0;
            const max = stat.latencies.length ? Math.max(...stat.latencies).toFixed(2) : 0;
            console.log(`[${name}] Count: ${stat.count} | Avg: ${avg}ms | Max: ${max}ms | Errors: ${stat.errors}`);
        };

        printStat('GET /auth/me', stats.authMe);
        printStat('GET /contacts', stats.getContacts);
        printStat('POST /contacts', stats.createContact);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
