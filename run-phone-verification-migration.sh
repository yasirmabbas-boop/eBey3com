#!/bin/bash
# Quick script to run phone verification migration
# Usage: ./run-phone-verification-migration.sh

echo "=========================================="
echo "Running Phone Verification Migration"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL in your environment or Replit Secrets"
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Run the verification/migration script
echo "Running migration verification script..."
tsx server/verify-phone-verification-migration.ts

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "You can now restart your server."
else
  echo ""
  echo "❌ Migration failed. Please check the error messages above."
  exit 1
fi
