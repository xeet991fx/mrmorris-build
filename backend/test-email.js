const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🔍 Testing email configuration...\n');

  const config = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "465"),
    secure: parseInt(process.env.EMAIL_PORT || "465") === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS?.replace(/\s/g, ''),
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
  };

  console.log('📧 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   User: ${config.auth.user}`);
  console.log(`   Pass: ${config.auth.pass?.substring(0, 4)}****\n`);

  const transporter = nodemailer.createTransport(config);

  try {
    console.log('⏳ Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully!\n');

    console.log('⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: "Test Email from MrMorris",
      html: `
        <h1>Test Email</h1>
        <p>If you received this email, your email configuration is working correctly!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${process.env.EMAIL_USER}\n`);

    console.log('✨ Your email configuration is working perfectly!');
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Verify your Gmail app password is correct');
    console.error('   2. Make sure 2FA is enabled on your Google account');
    console.error('   3. Create a new app password at: https://myaccount.google.com/apppasswords');
    console.error('   4. The app password should be 16 characters without spaces');
    console.error('\n   Current password (with spaces removed):', config.auth.pass);
    console.error('\n   Error details:', error);
  }
}

testEmail();
