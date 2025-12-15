#!/bin/bash

# Quick script to create employee user
# Usage: ./scripts/create-employee-user.sh "email@example.com" "Full Name"

EMPLOYEE_EMAIL="${1:-employee@example.com}"
EMPLOYEE_NAME="${2:-Employee User}"

echo "👤 Creating employee user..."
echo "Email: $EMPLOYEE_EMAIL"
echo "Name: $EMPLOYEE_NAME"
echo ""

# Create a temporary migration file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_create_employee_user.sql"

cat > "$MIGRATION_FILE" << EOF
-- Insert employee user into public.users table
DO \$\$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the auth user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = '$EMPLOYEE_EMAIL';
    
    IF v_user_id IS NOT NULL THEN
        -- Insert into users table
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            v_user_id,
            '$EMPLOYEE_EMAIL',
            '$EMPLOYEE_NAME',
            'project_manager'
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    ELSE
        RAISE EXCEPTION 'Auth user not found for email: $EMPLOYEE_EMAIL';
    END IF;
END \$\$;
EOF

echo "📤 Pushing migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Employee user created successfully!"
    echo ""
    echo "🎉 You can now login at http://localhost:3000"
    echo "Email: $EMPLOYEE_EMAIL"
    echo ""
    echo "Migration file kept at: $MIGRATION_FILE"
else
    echo "❌ Failed to create employee user"
    exit 1
fi
