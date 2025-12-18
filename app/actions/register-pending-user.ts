'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function registerPendingUser(params: {
    id: string
    email: string
    full_name?: string
    role: 'client' | 'project_manager' | 'admin'
    company_name?: string | null
}) {
    try {
        const supabase = createServiceClient()

        // Upsert minimal user profile with pending status
        const { error: upsertError } = await supabase
            .from('users')
            .upsert({
                id: params.id,
                email: params.email,
                full_name: params.full_name || params.email.split('@')[0],
                role: params.role,
                company_name: params.company_name || null,
                status: params.role === 'client' ? 'pending' : 'approved',
            }, { onConflict: 'id' })

        if (upsertError) {
            return { success: false, error: upsertError.message }
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error registering pending user' }
    }
}
