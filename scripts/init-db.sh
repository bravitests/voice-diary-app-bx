#!/bin/bash

# Voice Diary Database Initialization Script
# This script sets up the database for both development and production environments

set -e  # Exit on any error

echo "🎯 Voice Diary Database Initialization"
echo "====================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set your database connection string:"
    echo "export DATABASE_URL='postgresql://username:password@host:port/database'"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed"
    echo "Please install Node.js to run the migration script"
    exit 1
fi

echo "✅ Node.js is available"

# Check if required migration files exist
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_FILES=(
    "001_initial_schema.sql"
    "002_rate_limiting_tables.sql"
    "003_purposes_system.sql"
    "migrate.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$SCRIPT_DIR/$file" ]; then
        echo "❌ ERROR: Required file $file not found in scripts directory"
        exit 1
    fi
done

echo "✅ All required migration files found"

# Install required dependencies if not present
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the migration script
echo "🚀 Running database migrations..."
node "$SCRIPT_DIR/migrate.js"

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database initialization completed successfully!"
    echo "✅ Your Voice Diary application is ready to run"
    echo ""
    echo "Next steps:"
    echo "1. Start your application: npm run dev (development) or npm start (production)"
    echo "2. Deploy your smart contract to Base network"
    echo "3. Update NEXT_PUBLIC_CONTRACT_ADDRESS in your environment variables"
else
    echo "❌ Database initialization failed"
    exit 1
fi