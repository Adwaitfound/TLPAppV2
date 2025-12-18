'use server'

import { createClient } from '@supabase/supabase-js'

type ClientFormData = {
    company_name: string
    contact_person: string
    email: string
    phone: string
    address: string
}

type ClientResult = {
    success: boolean
    credentials?: {
        email: string
        password: string
    }
    error?: string
}

export async function createClientAccount(formData: ClientFormData): Promise<ClientResult> {
    try {
        console.log('[SERVER] createClientAccount called with:', { company_name: formData.company_name, email: formData.email })

        // Validate environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!url) {
            console.error('[SERVER] Missing NEXT_PUBLIC_SUPABASE_URL')
            return { success: false, error: 'NEXT_PUBLIC_SUPABASE_URL is not configured' }
        }

        if (!key) {
            console.error('[SERVER] Missing SUPABASE_SERVICE_ROLE_KEY')
            return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }
        }

        console.log('[SERVER] Creating admin client...')
        const supabaseAdmin = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Generate a random password
        const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase()

        console.log('[SERVER] Checking if auth user already exists...')
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUser?.users?.some(u => u.email === formData.email)

        let userId: string

        if (userExists) {
            console.log('[SERVER] Auth user already exists, finding existing user ID...')
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            const existingAuthUser = users?.find(u => u.email === formData.email)

            if (!existingAuthUser?.id) {
                return { success: false, error: 'User exists but could not retrieve ID' }
            }
            userId = existingAuthUser.id
            console.log('[SERVER] Using existing auth user:', userId)
        } else {
            console.log('[SERVER] Creating new auth user...')
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: formData.email,
                password: generatedPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: formData.contact_person,
                    role: 'client',
                }
            })

            if (authError) {
                console.error('[SERVER] Auth error:', authError)
                return { success: false, error: `Auth error: ${authError.message}` }
            }

            if (!authData.user?.id) {
                console.error('[SERVER] No user ID returned from auth')
                return { success: false, error: 'Failed to create auth user' }
            }

            userId = authData.user.id
            console.log('[SERVER] Auth user created:', userId)
        }

        console.log('[SERVER] Checking if user record exists...')
        const { data: existingUserRecord } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', userId)
            .single()

        if (!existingUserRecord) {
            console.log('[SERVER] Inserting user record...')
            const { error: userError } = await supabaseAdmin
                .from('users')
                .insert({
                    id: userId,
                    email: formData.email,
                    full_name: formData.contact_person,
                    role: 'client',
                    status: 'approved',
                    company_name: formData.company_name,
                })

            if (userError) {
                console.error('[SERVER] User insert error:', userError)
                return { success: false, error: `User insert error: ${userError.message}` }
            }

            console.log('[SERVER] User record created')
        } else {
            console.log('[SERVER] User record already exists')
        }

        console.log('[SERVER] Inserting client record...')
        const { error: clientError } = await supabaseAdmin
            .from('clients')
            .insert([{
                user_id: userId,
                company_name: formData.company_name,
                contact_person: formData.contact_person,
                email: formData.email,
                phone: formData.phone || '',
                address: formData.address || '',
                status: 'active',
                total_projects: 0,
                total_revenue: 0,
            }])

        if (clientError) {
            console.error('[SERVER] Client insert error:', clientError)
            return { success: false, error: `Client insert error: ${clientError.message}` }
        }

        console.log('[SERVER] Client record created successfully')
        const result: ClientResult = {
            success: true,
            credentials: {
                email: formData.email,
                password: generatedPassword
            }
        }
        console.log('[SERVER] Returning success result')
        return result
    } catch (error: any) {
        console.error('[SERVER] Caught exception:', error?.message || String(error))
        return {
            success: false,
            error: `Exception: ${error?.message || String(error)}`
        }
    }
}
