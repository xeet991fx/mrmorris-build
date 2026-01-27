/**
 * Migration: Add TTL Index for AgentExecution Log Retention
 * Story 3.13 AC5: TTL retention (30 days standard, 365 days enterprise)
 *
 * Run this migration after deploying the AgentExecution model changes.
 *
 * Usage:
 *   npx ts-node backend/src/migrations/add-execution-ttl-index.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clianta';

async function addTTLIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('agentexecutions');

    // Check if TTL index already exists
    const indexes = await collection.indexes();
    const ttlIndexExists = indexes.some(
      (idx) => idx.name === 'createdAt_ttl_30days'
    );

    if (ttlIndexExists) {
      console.log('ℹ️  TTL index already exists. Skipping creation.');
    } else {
      console.log('📝 Creating TTL index for 30-day retention...');

      // Story 3.13 AC5: 30 days = 2592000 seconds
      await collection.createIndex(
        { createdAt: 1 },
        {
          expireAfterSeconds: 2592000, // 30 days
          background: true,
          name: 'createdAt_ttl_30days'
        }
      );

      console.log('✅ TTL index created successfully');
      console.log('   - Field: createdAt');
      console.log('   - Retention: 30 days (2592000 seconds)');
      console.log('   - MongoDB will automatically delete documents older than 30 days');
    }

    console.log('\n📋 Enterprise Tier Note:');
    console.log('   For 365-day retention (enterprise tier), manually update the index:');
    console.log('   1. Drop existing index: db.agentexecutions.dropIndex("createdAt_ttl_30days")');
    console.log('   2. Create new index: db.agentexecutions.createIndex({createdAt: 1}, {expireAfterSeconds: 31536000, name: "createdAt_ttl_365days"})');

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
addTTLIndex()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
