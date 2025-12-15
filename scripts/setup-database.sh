#!/bin/bash

# Supabase Database Setup Script
# This will create all tables in your Supabase project

echo "🚀 Setting up Supabase Database..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Extract Supabase URL and get project ref
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | cut -d '.' -f1)

echo "📋 Project Reference: $PROJECT_REF"
echo ""
echo "🔐 Authenticating with Supabase..."
echo "A browser window will open for you to login."
echo ""

# Login to Supabase (opens browser for OAuth)
supabase login

if [ $? -ne 0 ]; then
    echo "❌ Failed to authenticate"
    exit 1
fi

echo ""
echo "🔗 Linking project..."

# Link the project
supabase link --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "❌ Failed to link project"
    exit 1
fi

echo ""
echo "📤 Pushing database migration..."

# Push migrations to create tables
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database tables created successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Go to https://app.supabase.com"
    echo "2. Navigate to Authentication > Users"
    echo "3. Click 'Add User'"
    echo "4. Email: adwait@thelostproject.in"
    echo "5. Password: [your choice]"
    echo "6. Auto Confirm User: ✓ YES"
    echo "7. Then run: npm run setup:admin"
    echo ""
else
    echo "❌ Failed to push migrations"
    exit 1
fi
