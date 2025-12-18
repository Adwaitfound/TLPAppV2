'use server'

import { createServiceClient } from '@/lib/supabase/server'

type SignupParams = {
    email: string
    password: string
    full_name: string
    company_name?: string | null
    role: 'client' | 'project_manager' | 'admin'
}

export async function adminCreateUserSignup(params: SignupParams) {
    const { email, password, full_name, company_name, role } = params
    try {
        const supabase = createServiceClient()

        // Create auth user via admin API, auto-confirm email to avoid login blocker
        const { data: authData, error: authError } = await (supabase as any).auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, company_name: company_name || null, role }
        })

        if (authError) {
            return { success: false, error: authError.message }
        }
        const userId = authData?.user?.id
        if (!userId) {
            return { success: false, error: 'Auth user creation failed' }
        }

        // Upsert user profile with pending status for clients
        const { error: upsertError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email,
                full_name,
                role,
                company_name: company_name || null,
                status: role === 'client' ? 'pending' : 'approved',
            }, { onConflict: 'id' })

        if (upsertError) {
            return { success: false, error: upsertError.message }
        }

        return { success: true, userId }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error during admin signup' }
    }
}
