
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';

// Load env
dotenv.config();

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI missing");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);

        // Use flexible schema to avoid importing model dependencies
        const User = (mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }))) as any;

        const user = await User.findOne({});
        if (!user) {
            console.error("No user found in DB to test with.");
            process.exit(1);
        }

        const secret = process.env.JWT_SECRET || "dev-only-secret-do-not-use-in-production";
        const token = jwt.sign(
            { id: user._id },
            secret,
            { expiresIn: '1h' }
        );

        console.log(`Testing with user ID: ${user._id}`);

        // Run Autocannon
        const url = "http://localhost:5000/api/auth/me";
        const cmd = `npx autocannon -c 100 -d 10 -H "Authorization: Bearer ${token}" ${url}`;

        console.log(`Running: ${cmd}`);
        try {
            execSync(cmd, { stdio: 'inherit' });
        } catch (e) {
            // autocannon might exit with non-zero if threshold fails, ignoring
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
