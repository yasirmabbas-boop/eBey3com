#!/usr/bin/env tsx
/**
 * Twilio WhatsApp Verify Connection Test Script
 * Tests the Twilio Verify WhatsApp integration by sending a test OTP
 * 
 * Usage: tsx server/test-whatsapp.ts <phone_number>
 * Example: tsx server/test-whatsapp.ts 07501234567
 */

import { sendWhatsAppOTP, verifyWhatsAppOTP, isWhatsAppConfigured } from "./whatsapp";
import readline from 'readline';

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

async function promptForInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function testTwilioWhatsAppVerify() {
  logSection('Twilio WhatsApp Verify Connection Test');
  
  // Check environment variables
  log('\n📋 Checking Replit Secrets configuration...', colors.yellow);
  
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
  
  console.log(`   TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID ? colors.green + '✓ Set' + colors.reset + ` (${TWILIO_ACCOUNT_SID.substring(0, 8)}...)` : colors.red + '✗ Not set' + colors.reset}`);
  console.log(`   TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN ? colors.green + '✓ Set' + colors.reset + ` (${TWILIO_AUTH_TOKEN.substring(0, 8)}...)` : colors.red + '✗ Not set' + colors.reset}`);
  console.log(`   TWILIO_VERIFY_SERVICE_SID: ${TWILIO_VERIFY_SERVICE_SID ? colors.green + '✓ Set' + colors.reset + ` (${TWILIO_VERIFY_SERVICE_SID})` : colors.red + '✗ Not set' + colors.reset}`);
  
  try {
    isWhatsAppConfigured();
    log('\n✓ Configuration check passed!', colors.green);
  } catch (error: any) {
    log('\n❌ ERROR: Twilio WhatsApp credentials not properly configured!', colors.red);
    log('\nPlease set the following in Replit Secrets:', colors.yellow);
    log('   • TWILIO_ACCOUNT_SID: Your Twilio Account SID', colors.reset);
    log('   • TWILIO_AUTH_TOKEN: Your Twilio Auth Token', colors.reset);
    log('   • TWILIO_VERIFY_SERVICE_SID: Your Twilio Verify Service SID (VA...)', colors.reset);
    log('\nError: ' + error.message, colors.red);
    process.exit(1);
  }
  
  // Get phone number from command line argument
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    log('\n❌ ERROR: Phone number required!', colors.red);
    log('\nUsage: tsx server/test-whatsapp.ts <phone_number>', colors.yellow);
    log('Example: tsx server/test-whatsapp.ts 07501234567', colors.cyan);
    log('Example: tsx server/test-whatsapp.ts +9647501234567', colors.cyan);
    process.exit(1);
  }
  
  // Send test OTP
  logSection('Sending Test OTP via Twilio WhatsApp Verify');
  log(`📱 Target phone number: ${phoneNumber}`, colors.blue);
  log('📤 Sending OTP (Twilio will generate the code automatically)...', colors.yellow);
  log('⚠️  Note: Twilio Verify generates and manages the OTP code internally', colors.cyan);
  
  const startTime = Date.now();
  const result = await sendWhatsAppOTP(phoneNumber);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    log(`\n✅ SUCCESS! OTP sent successfully in ${duration}ms`, colors.green);
    log(`\n📲 Check your WhatsApp for the verification code from Twilio`, colors.cyan);
    log('\nThe message will be sent from Twilio\'s WhatsApp Business number.', colors.yellow);
    
    // Prompt for verification code
    log('\n' + '='.repeat(60), colors.reset);
    log('Now let\'s test verification...', colors.bright + colors.cyan);
    log('='.repeat(60), colors.reset);
    
    const code = await promptForInput('\n🔑 Enter the verification code you received: ');
    
    if (!code) {
      log('\n⚠️  No code entered. Skipping verification test.', colors.yellow);
      process.exit(0);
    }
    
    log('\n🔍 Verifying code...', colors.yellow);
    const verifyStartTime = Date.now();
    const verifyResult = await verifyWhatsAppOTP(phoneNumber, code);
    const verifyDuration = Date.now() - verifyStartTime;
    
    if (verifyResult.success) {
      log(`\n✅ VERIFICATION SUCCESS! Code verified in ${verifyDuration}ms`, colors.green);
      log('\n🎉 Your Twilio WhatsApp Verify integration is working perfectly!', colors.green);
    } else {
      log(`\n❌ VERIFICATION FAILED! (took ${verifyDuration}ms)`, colors.red);
      if (verifyResult.errorAr) {
        log(`\nArabic Error: ${verifyResult.errorAr}`, colors.yellow);
      }
      if (verifyResult.error) {
        log(`English Error: ${verifyResult.error}`, colors.yellow);
      }
      log('\nPossible reasons:', colors.yellow);
      log('   • Code was entered incorrectly', colors.reset);
      log('   • Code has expired (Twilio codes typically expire in 10 minutes)', colors.reset);
      log('   • Code was already used', colors.reset);
      process.exit(1);
    }
  } else {
    log('\n❌ FAILED to send OTP', colors.red);
    if (result.errorAr) {
      log(`\nArabic Error: ${result.errorAr}`, colors.yellow);
    }
    if (result.error) {
      log(`English Error: ${result.error}`, colors.yellow);
    }
    log('\nPossible issues:', colors.yellow);
    log('   • Invalid Twilio credentials (Account SID or Auth Token)', colors.reset);
    log('   • Invalid Verify Service SID', colors.reset);
    log('   • Phone number format incorrect', colors.reset);
    log('   • Twilio account not properly configured for WhatsApp', colors.reset);
    log('   • Insufficient Twilio account balance', colors.reset);
    log('\nCheck the error logs above for more details.', colors.cyan);
    process.exit(1);
  }
  
  logSection('Test Complete');
}

// Run the test
testTwilioWhatsAppVerify().catch((error) => {
  log('\n💥 Unexpected error occurred:', colors.red);
  console.error(error);
  process.exit(1);
});
