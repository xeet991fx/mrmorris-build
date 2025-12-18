/**
 * Test script for the Agent System
 * Run with: npx ts-node --transpile-only src/test-agent.ts
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function testAgent() {
    console.log('🧪 Agent Test Script\n');

    // Connect to database
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected!\n');

    // Find a user and workspace
    const User = mongoose.model('User', new mongoose.Schema({
        email: String,
        name: String,
    }));

    const Project = mongoose.model('Project', new mongoose.Schema({
        name: String,
        userId: mongoose.Schema.Types.ObjectId,
    }));

    const user = await User.findOne({});
    if (!user) {
        console.log('❌ No users found in database');
        process.exit(1);
    }
    console.log(`👤 User: ${user.email} (${user._id})`);

    const workspace = await Project.findOne({ userId: user._id });
    if (!workspace) {
        console.log('❌ No workspaces found for this user');
        process.exit(1);
    }
    console.log(`🏢 Workspace: ${workspace.name} (${workspace._id})\n`);

    // Generate a token
    const token = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
        { expiresIn: '1h' }
    );
    console.log(`🔑 Token: ${token.substring(0, 50)}...\n`);

    // Test the agent endpoint
    console.log('📡 Testing agent endpoints...\n');

    const baseUrl = 'http://localhost:5000';
    const workspaceId = workspace._id.toString();

    // Test 1: Agent Status
    console.log('Test 1: GET /agent/status');
    try {
        const statusRes = await fetch(`${baseUrl}/api/workspaces/${workspaceId}/agent/status`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const statusData = await statusRes.json();
        console.log('Status:', statusRes.status);
        console.log('Response:', JSON.stringify(statusData, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n---\n');

    // Test 2: Agent Chat - Create Contact
    console.log('Test 2: POST /agent/chat - Create Contact');
    try {
        const chatRes = await fetch(`${baseUrl}/api/workspaces/${workspaceId}/agent/chat`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Create a contact named Test Agent from AI Corp with email test@aicorp.com',
            }),
        });
        const chatData = await chatRes.json();
        console.log('Status:', chatRes.status);
        console.log('Response:', JSON.stringify(chatData, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    console.log('\n---\n');

    // Test 3: Agent Chat - Search Contacts
    console.log('Test 3: POST /agent/chat - Search Contacts');
    try {
        const searchRes = await fetch(`${baseUrl}/api/workspaces/${workspaceId}/agent/chat`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Search for contacts at AI Corp',
            }),
        });
        const searchData = await searchRes.json();
        console.log('Status:', searchRes.status);
        console.log('Response:', JSON.stringify(searchData, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }

    await mongoose.disconnect();
    console.log('\n✅ Tests complete!');
}

testAgent().catch(console.error);
