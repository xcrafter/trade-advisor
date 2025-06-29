#!/bin/bash

# Setup script for 5-day volume analysis feature
echo "🔧 Setting up 5-day volume analysis..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your DATABASE_URL and try again"
    exit 1
fi

echo "📊 Adding 5-day volume columns to signals table..."

# Run the migration
psql "$DATABASE_URL" -f database/add-5day-volume-data.sql

if [ $? -eq 0 ]; then
    echo "✅ 5-day volume database migration completed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart your Next.js development server"
    echo "2. Analyze a stock to see 5-day volume data populate"
    echo "3. Check the console logs for 5-day volume metrics"
    echo ""
    echo "🎯 The system will now calculate and display:"
    echo "   • 5-day average volume"
    echo "   • Current volume vs 5-day average percentage"
    echo "   • Volume trend (increasing/decreasing/stable)"
    echo "   • 5-day volume high/low range"
else
    echo "❌ Migration failed. Please check your database connection and try again."
    exit 1
fi 