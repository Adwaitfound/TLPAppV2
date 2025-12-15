#!/bin/bash

# Create admin user in database
# Run this AFTER creating the auth user in Supabase Dashboard

echo "👤 Setting up admin user..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    exit 1
fi

# Extract Supabase URL and get project ref
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | cut -d '.' -f1)

echo "Have you already created the auth user in Supabase Dashboard?"
echo "(Authentication > Users > Add User)"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please create the auth user first, then run this script again."
    exit 1
fi

echo ""
read -p "Enter the admin's email: " ADMIN_EMAIL

if [ -z "$ADMIN_EMAIL" ]; then
    echo "❌ No email provided. Exiting."
    exit 1
fi

read -p "Enter the admin's full name: " ADMIN_NAME

if [ -z "$ADMIN_NAME" ]; then
    echo "❌ No name provided. Exiting."
    exit 1
fi

echo ""
echo "Creating database user record..."

# Create a temporary migration file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_create_admin_user.sql"

cat > "$MIGRATION_FILE" << EOF
-- Insert admin user into public.users
INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = '$ADMIN_EMAIL'),
  '$ADMIN_EMAIL',
  '$ADMIN_NAME',
  'admin',
  'The Lost Project'
)
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;
EOF

# Push the migration
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin user created successfully!"
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo "1. Go to http://localhost:3000"
    echo "2. Click 'Get Started'"
    echo "3. Login with: $ADMIN_EMAIL"
    echo ""
    rm "$MIGRATION_FILE"
else
    echo "❌ Failed to create admin user"
    echo "Make sure you created the auth user first!"
    rm "$MIGRATION_FILE"
    exit 1
fi
