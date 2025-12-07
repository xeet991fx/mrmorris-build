/**
 * Test file for opportunity utilities
 * Run with: npx ts-node frontend/test-utils.ts
 */

import {
  getDaysInStage,
  getDaysSinceLastActivity,
  calculateDealTemperature,
  getTemperatureIcon,
  formatRelativeTime,
  formatCurrency,
  getInitials,
} from './lib/utils/opportunityUtils';

// Mock opportunity data
const mockOpportunity = {
  _id: '123',
  title: 'Acme Corp - Annual License',
  value: 50000,
  probability: 75,
  stageHistory: [
    {
      stageId: 'stage_1',
      stageName: 'New Lead',
      enteredAt: new Date('2024-01-01'),
      exitedAt: new Date('2024-01-05'),
      duration: 345600000,
    },
    {
      stageId: 'stage_2',
      stageName: 'Qualified',
      enteredAt: new Date('2024-01-05'),
      exitedAt: new Date('2024-01-15'),
      duration: 864000000,
    },
    {
      stageId: 'stage_3',
      stageName: 'Proposal',
      enteredAt: new Date('2024-01-15'),
      // No exitedAt - still in this stage
    },
  ],
  lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  activityCount: 12,
  emailCount: 8,
  callCount: 3,
  createdAt: new Date('2024-01-01'),
  aiInsights: {
    dealScore: 78,
  },
};

console.log('🧪 Testing Opportunity Utils\n');

// Test 1: Days in stage
console.log('1. getDaysInStage()');
const daysInStage = getDaysInStage(mockOpportunity);
console.log(`   Result: ${daysInStage} days`);
console.log(`   ✅ Should be ~${Math.floor((Date.now() - new Date('2024-01-15').getTime()) / (1000 * 60 * 60 * 24))} days\n`);

// Test 2: Days since activity
console.log('2. getDaysSinceLastActivity()');
const daysSinceActivity = getDaysSinceLastActivity(mockOpportunity);
console.log(`   Result: ${daysSinceActivity} days`);
console.log(`   ✅ Should be 0 (activity was 2 hours ago)\n`);

// Test 3: Temperature calculation
console.log('3. calculateDealTemperature()');
const temperature = calculateDealTemperature(mockOpportunity);
console.log(`   Result: ${temperature}`);
console.log(`   Icon: ${getTemperatureIcon(temperature)}`);
console.log(`   ✅ Should be "hot" (recent activity + high probability)\n`);

// Test 4: Format relative time
console.log('4. formatRelativeTime()');
const relativeTime = formatRelativeTime(mockOpportunity.lastActivityAt);
console.log(`   Result: ${relativeTime}`);
console.log(`   ✅ Should be "2h ago"\n`);

// Test 5: Format currency
console.log('5. formatCurrency()');
const formatted = formatCurrency(50000, 'USD', false);
const compact = formatCurrency(50000, 'USD', true);
console.log(`   Regular: ${formatted}`);
console.log(`   Compact: ${compact}`);
console.log(`   ✅ Should be "$50,000" and "$50K"\n`);

// Test 6: Get initials
console.log('6. getInitials()');
const initials = getInitials('John Smith');
console.log(`   Result: ${initials}`);
console.log(`   ✅ Should be "JS"\n`);

// Test cold deal
console.log('7. Cold Deal Temperature');
const coldDeal = {
  ...mockOpportunity,
  lastActivityAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
  probability: 20,
  activityCount: 0,
};
const coldTemp = calculateDealTemperature(coldDeal);
console.log(`   Result: ${coldTemp} ${getTemperatureIcon(coldTemp)}`);
console.log(`   ✅ Should be "cold" (no activity for 20 days)\n`);

// Test warm deal
console.log('8. Warm Deal Temperature');
const warmDeal = {
  ...mockOpportunity,
  lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  probability: 50,
  activityCount: 3,
};
const warmTemp = calculateDealTemperature(warmDeal);
console.log(`   Result: ${warmTemp} ${getTemperatureIcon(warmTemp)}`);
console.log(`   ✅ Should be "warm" (moderate activity)\n`);

console.log('✅ All tests completed!\n');
