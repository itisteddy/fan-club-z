#!/bin/bash

# Fan Club Z Database Setup Script
# This script helps set up PostgreSQL database for development

set -e

echo "🚀 Setting up Fan Club Z Database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "📖 Installation guides:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "   Windows: https://www.postgresql.org/download/windows/"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file. Please edit it with your database credentials."
else
    echo "✅ .env file already exists"
fi

# Load environment variables
source .env

# Create database if it doesn't exist
echo "🗄️  Creating database '$DB_NAME' if it doesn't exist..."
createdb "$DB_NAME" 2>/dev/null || echo "Database '$DB_NAME' already exists"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Seed database with initial data
echo "🌱 Seeding database with initial data..."
npm run db:seed

echo "✅ Database setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start the server: npm run dev"
echo "   2. Test the API: http://localhost:$PORT/health"
echo "   3. Check the database: psql -d $DB_NAME"
echo ""
echo "📊 Database tables created:"
echo "   • users"
echo "   • bets"
echo "   • bet_entries"
echo "   • clubs"
echo "   • transactions"
echo ""
echo "🔐 Default demo account:"
echo "   Email: demo@fanclubz.app"
echo "   Password: demo123" 