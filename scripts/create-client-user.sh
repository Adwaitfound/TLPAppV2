#!/bin/bash

# Quick script to create client user
# Usage: ./scripts/create-client-user.sh "email@example.com" "Full Name" "Company Name"

CLIENT_EMAIL="${1:-client@example.com}"
CLIENT_NAME="${2:-Client User}"
COMPANY_NAME="${3:-Example Company}"

echo "👤 Creating client user..."
echo "Email: $CLIENT_EMAIL"
echo "Name: $CLIENT_NAME"
echo "Company: $COMPANY_NAME"
echo ""

# Create a temporary migration file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_create_client_user.sql"

cat > "$MIGRATION_FILE" << EOF
-- Insert client user into public.users and clients tables
DO \$\$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the auth user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = '$CLIENT_EMAIL';
    
    IF v_user_id IS NOT NULL THEN
        -- Insert into users table
        INSERT INTO public.users (id, email, full_name, role, company_name)
        VALUES (
            v_user_id,
            '$CLIENT_EMAIL',
            '$CLIENT_NAME',
            'client',
            '$COMPANY_NAME'
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            company_name = EXCLUDED.company_name;
        
        -- Insert into clients table
        INSERT INTO public.clients (user_id, company_name, contact_person, email, status)
        VALUES (
            v_user_id,
            '$COMPANY_NAME',
            '$CLIENT_NAME',
            '$CLIENT_EMAIL',
            'active'
        )
        ON CONFLICT (user_id) DO UPDATE
        SET 
            company_name = EXCLUDED.company_name,
            contact_person = EXCLUDED.contact_person,
            email = EXCLUDED.email;
    ELSE
        RAISE EXCEPTION 'Auth user not found for email: $CLIENT_EMAIL';
    END IF;
END \$\$;
EOF

echo "📤 Pushing migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Client user created successfully!"
    echo ""
    echo "🎉 You can now login at http://localhost:3000"
    echo "Email: $CLIENT_EMAIL"
    echo ""
    echo "Migration file kept at: $MIGRATION_FILE"
else
    echo "❌ Failed to create client user"
    exit 1
fi
