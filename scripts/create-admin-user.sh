#!/bin/bash

# Quick script to create admin user
# Usage: ./scripts/create-admin-user.sh "email@example.com" "Full Name"

ADMIN_EMAIL="${1:-adwait@thelostproject.in}"
ADMIN_NAME="${2:-Adwait Parchure}"

echo "👤 Creating admin user..."
echo "Email: $ADMIN_EMAIL"
echo "Name: $ADMIN_NAME"
echo ""

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

echo "📤 Pushing migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin user created successfully!"
    echo ""
    echo "🎉 You can now login at http://localhost:3000"
    echo "Email: $ADMIN_EMAIL"
    echo ""
    rm "$MIGRATION_FILE"
else
    echo "❌ Failed to create admin user"
    rm "$MIGRATION_FILE"
    exit 1
fi
