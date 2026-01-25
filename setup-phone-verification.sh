#!/bin/bash
# Quick Setup Script for Phone Verification & Bidding Limits

echo "=========================================="
echo "Phone Verification & Bidding Limits Setup"
echo "=========================================="
echo ""

# Check if Replit Secrets are set
echo "Step 1: Checking Replit Secrets..."
if [ -z "$WA_PHONE_ID" ]; then
  echo "❌ WA_PHONE_ID not set in Replit Secrets"
  exit 1
else
  echo "✅ WA_PHONE_ID is set"
fi

if [ -z "$WA_TOKEN" ]; then
  echo "❌ WA_TOKEN not set in Replit Secrets"
  exit 1
else
  echo "✅ WA_TOKEN is set"
fi

if [ -z "$WA_ACCOUNT_ID" ]; then
  echo "⚠️  WA_ACCOUNT_ID not set (optional)"
else
  echo "✅ WA_ACCOUNT_ID is set"
fi

echo ""
echo "Step 2: Running database migration..."
npm run db:push

if [ $? -ne 0 ]; then
  echo "❌ Migration failed!"
  exit 1
fi

echo ""
echo "✅ Database migration completed!"
echo ""
echo "=========================================="
echo "Setup Complete! 🎉"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test WhatsApp connection:"
echo "   tsx server/test-whatsapp.ts YOUR_PHONE_NUMBER"
echo ""
echo "2. Restart your server:"
echo "   npm run dev"
echo ""
echo "3. Test the phone verification flow:"
echo "   POST /api/auth/send-phone-otp"
echo "   POST /api/auth/verify-phone-otp"
echo ""
