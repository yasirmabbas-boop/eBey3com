#!/usr/bin/env tsx
/**
 * WhatsApp Connection Test Script
 * Tests the WhatsApp Business API connection by sending a test OTP
 * 
 * Usage: tsx server/test-whatsapp.ts <phone_number>
 * Example: tsx server/test-whatsapp.ts 07501234567
 */

import { sendWhatsAppOTP, generateOTPCode, isWhatsAppConfigured } from "./whatsapp";

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

async function testWhatsAppConnection() {
  logSection('WhatsApp Business API Connection Test');
  
  // Check environment variables
  log('\n📋 Checking Replit Secrets configuration...', colors.yellow);
  
  const WA_PHONE_ID = process.env.WA_PHONE_ID;
  const WA_ACCOUNT_ID = process.env.WA_ACCOUNT_ID;
  const WA_TOKEN = process.env.WA_TOKEN;
  
  console.log(`   WA_PHONE_ID: ${WA_PHONE_ID ? colors.green + '✓ Set' + colors.reset + ` (${WA_PHONE_ID.substring(0, 8)}...)` : colors.red + '✗ Not set' + colors.reset}`);
  console.log(`   WA_ACCOUNT_ID: ${WA_ACCOUNT_ID ? colors.green + '✓ Set' + colors.reset + ` (${WA_ACCOUNT_ID.substring(0, 8)}...)` : colors.red + '✗ Not set' + colors.reset}`);
  console.log(`   WA_TOKEN: ${WA_TOKEN ? colors.green + '✓ Set' + colors.reset + ` (${WA_TOKEN.substring(0, 20)}...)` : colors.red + '✗ Not set' + colors.reset}`);
  
  if (!isWhatsAppConfigured()) {
    log('\n❌ ERROR: WhatsApp credentials not properly configured!', colors.red);
    log('\nPlease set the following in Replit Secrets:', colors.yellow);
    log('   • WA_PHONE_ID: Your WhatsApp Business Phone Number ID', colors.reset);
    log('   • WA_ACCOUNT_ID: Your WhatsApp Business Account ID', colors.reset);
    log('   • WA_TOKEN: Your WhatsApp Business API Access Token', colors.reset);
    process.exit(1);
  }
  
  log('\n✓ Configuration check passed!', colors.green);
  
  // Get phone number from command line argument
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    log('\n❌ ERROR: Phone number required!', colors.red);
    log('\nUsage: tsx server/test-whatsapp.ts <phone_number>', colors.yellow);
    log('Example: tsx server/test-whatsapp.ts 07501234567', colors.cyan);
    log('Example: tsx server/test-whatsapp.ts +9647501234567', colors.cyan);
    process.exit(1);
  }
  
  // Generate test OTP
  const testOTP = generateOTPCode();
  log(`\n🔐 Generated test OTP: ${colors.bright}${testOTP}${colors.reset}`, colors.cyan);
  
  // Send test message
  logSection('Sending Test OTP via WhatsApp');
  log(`📱 Target phone number: ${phoneNumber}`, colors.blue);
  log('📤 Sending message...', colors.yellow);
  
  const startTime = Date.now();
  const success = await sendWhatsAppOTP(phoneNumber, testOTP);
  const duration = Date.now() - startTime;
  
  if (success) {
    log(`\n✅ SUCCESS! OTP sent successfully in ${duration}ms`, colors.green);
    log(`\n📲 Check your WhatsApp for the verification code: ${colors.bright}${testOTP}${colors.reset}`, colors.cyan);
    log('\nIf you received the message, your WhatsApp integration is working correctly! 🎉', colors.green);
  } else {
    log('\n❌ FAILED to send OTP', colors.red);
    log('\nPossible issues:', colors.yellow);
    log('   • Invalid credentials (WA_PHONE_ID or WA_TOKEN)', colors.reset);
    log('   • Phone number format incorrect', colors.reset);
    log('   • WhatsApp Business Account not properly configured', colors.reset);
    log('   • Message template "ebey3_auth_code" not approved in Meta Business Manager', colors.reset);
    log('\nCheck the error logs above for more details.', colors.cyan);
    process.exit(1);
  }
  
  logSection('Test Complete');
}

// Run the test
testWhatsAppConnection().catch((error) => {
  log('\n💥 Unexpected error occurred:', colors.red);
  console.error(error);
  process.exit(1);
});
