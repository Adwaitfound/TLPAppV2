-- Insert employee user into public.users table
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the auth user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'employee@thelostproject.in';
    
    IF v_user_id IS NOT NULL THEN
        -- Insert into users table
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            v_user_id,
            'employee@thelostproject.in',
            'Employee User',
            'project_manager'
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    ELSE
        RAISE EXCEPTION 'Auth user not found for email: employee@thelostproject.in';
    END IF;
END $$;
