// Quick test script to verify email configuration
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

async function testEmail() {
  console.log('🧪 Testing email configuration...\n');

  // Check environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ EMAIL_USER or EMAIL_PASS not configured in .env');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS.substring(0, 4)}****\n`);

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ Email transporter verified successfully\n');
  } catch (err) {
    console.error('❌ Email transporter verification failed:', err.message);
    process.exit(1);
  }

  // Send test email
  try {
    const info = await transporter.sendMail({
      from: `"Advance Todo Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: '🧪 Test Email from Advance Todo',
      text: `
Hi there!

This is a test email to verify your email configuration is working correctly.

✅ If you're reading this, your email setup is perfect!

Test Details:
- Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
- From: ${process.env.EMAIL_USER}
- To: ${process.env.EMAIL_USER}

Your scheduled emails will be sent at:
- Morning: 8:00 AM IST
- Evening: 9:00 PM IST

Stay productive!
      `.trim(),
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 Check your inbox at ${process.env.EMAIL_USER}\n`);
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
    process.exit(1);
  }
}

testEmail();
