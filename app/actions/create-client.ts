'use server'

import { createClient } from '@supabase/supabase-js'

export async function createClientAccount(formData: {
    company_name: string
    contact_person: string
    email: string
    phone: string
    address: string
}) {
    try {
        // Create admin client with service role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Generate a random password
        const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase()

        // Create auth user account for the client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: {
                full_name: formData.contact_person,
                role: 'client',
            }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Failed to create user account')

        // Create user record
        const { error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authData.user.id,
                email: formData.email,
                full_name: formData.contact_person,
                role: 'client',
                company_name: formData.company_name,
            })

        if (userError) throw userError

        // Create client record
        const { error: clientError } = await supabaseAdmin
            .from('clients')
            .insert([{
                user_id: authData.user.id,
                company_name: formData.company_name,
                contact_person: formData.contact_person,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                status: 'active',
                total_projects: 0,
                total_revenue: 0,
            }])

        if (clientError) throw clientError

        return {
            success: true,
            credentials: {
                email: formData.email,
                password: generatedPassword
            }
        }
    } catch (error: any) {
        console.error('Error creating client:', error)
        return {
            success: false,
            error: error.message || 'Failed to create client'
        }
    }
}
