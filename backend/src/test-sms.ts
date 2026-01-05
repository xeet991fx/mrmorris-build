/**
 * SMS Test Script
 * 
 * Run this to test your Twilio configuration:
 * npx ts-node src/test-sms.ts +1234567890
 * 
 * Replace +1234567890 with your phone number (E.164 format)
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendSMS, validateSMSConfig } from './services/SMSService';

async function testSMS() {
    // Get the phone number from command line argument
    const testPhoneNumber = process.argv[2];

    if (!testPhoneNumber) {
        console.log('❌ No phone number provided');
        console.log('');
        console.log('Usage: npx ts-node src/test-sms.ts +1234567890');
        console.log('');
        console.log('Replace +1234567890 with your phone number in E.164 format');
        console.log('Examples:');
        console.log('  +14155551234 (US)');
        console.log('  +919876543210 (India)');
        process.exit(1);
    }

    console.log('='.repeat(50));
    console.log('📱 TWILIO SMS TEST');
    console.log('='.repeat(50));
    console.log('');

    // Check environment variables
    console.log('Checking Twilio configuration...');
    console.log('');

    const hasSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasPhone = !!process.env.TWILIO_PHONE_NUMBER;

    console.log(`  TWILIO_ACCOUNT_SID: ${hasSid ? '✅ Set' : '❌ Missing'}`);
    console.log(`  TWILIO_AUTH_TOKEN:  ${hasToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`  TWILIO_PHONE_NUMBER: ${hasPhone ? '✅ Set (' + process.env.TWILIO_PHONE_NUMBER + ')' : '❌ Missing'}`);
    console.log('');

    if (!hasSid || !hasToken || !hasPhone) {
        console.log('❌ Twilio configuration is incomplete');
        console.log('');
        console.log('Please add these to your .env file:');
        console.log('  TWILIO_ACCOUNT_SID=your_account_sid');
        console.log('  TWILIO_AUTH_TOKEN=your_auth_token');
        console.log('  TWILIO_PHONE_NUMBER=+1234567890');
        process.exit(1);
    }

    // Send test SMS
    console.log(`📤 Sending test SMS to: ${testPhoneNumber}`);
    console.log('');

    const result = await sendSMS({
        to: testPhoneNumber,
        message: `🧪 Test message from Clianta CRM! Your Twilio SMS integration is working correctly. Time: ${new Date().toISOString()}`,
    });

    console.log('');
    console.log('='.repeat(50));
    console.log('RESULT:');
    console.log('='.repeat(50));
    console.log('');

    if (result.success) {
        console.log('✅ SMS SENT SUCCESSFULLY!');
        console.log('');
        console.log(`  Message ID: ${result.messageId}`);
        console.log(`  Status: ${result.status}`);
        console.log('');
        console.log('🎉 Your Twilio integration is working!');
    } else {
        console.log('❌ SMS FAILED TO SEND');
        console.log('');
        console.log(`  Error: ${result.error}`);
        console.log('');
        console.log('Common issues:');
        console.log('  1. Invalid phone number format (use E.164 like +1234567890)');
        console.log('  2. Twilio credentials are incorrect');
        console.log('  3. Twilio account is in trial and recipient is not verified');
        console.log('  4. Insufficient funds in Twilio account');
    }

    console.log('');
}

testSMS().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
