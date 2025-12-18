'use server'

import { createClient } from '@supabase/supabase-js'

export async function createTeamMember(formData: {
    email: string
    full_name: string
    role: 'admin' | 'project_manager' | 'employee'
    password: string
}) {
    try {
        // Validate environment variables
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your .env.local file.')
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        // Create admin client with service role key (bypasses RLS and email confirmation)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Create user with admin client - this bypasses email confirmation
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: formData.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: formData.full_name,
                role: formData.role,
            }
        })

        if (authError) {
            console.error('Auth error:', authError)
            return { error: authError.message }
        }

        if (!authData.user) {
            return { error: 'Failed to create user' }
        }

        // Update the users table with the role and full name
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                full_name: formData.full_name,
                role: formData.role,
            })
            .eq('id', authData.user.id)

        if (updateError) {
            console.error('Update error:', updateError)
            // Don't fail completely if update fails, user is already created
            console.warn('User created but profile update failed:', updateError.message)
        }

        return {
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                full_name: formData.full_name,
                role: formData.role
            }
        }
    } catch (error: any) {
        console.error('Error creating team member:', error)
        return { error: error?.message || String(error) || 'Failed to create team member' }
    }
}
