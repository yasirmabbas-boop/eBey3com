#!/bin/bash

# Run the verification_codes table migration
# This creates the table needed for WhatsApp OTP verification

echo "🔄 Running verification_codes table migration..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Installing PostgreSQL client..."
    apt-get update && apt-get install -y postgresql-client
fi

# Run the migration
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -p ${PGPORT:-5432} -f migrations/0008_create_verification_codes.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo "📋 The verification_codes table is now ready for OTP storage."
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi
