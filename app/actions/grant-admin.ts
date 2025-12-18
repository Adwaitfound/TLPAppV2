'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function grantAdminByEmail(email: string) {
    if (!email || !email.includes('@')) {
        return { success: false, error: 'Provide a valid email.' }
    }

    try {
        const supabase = createServiceClient()

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, email, role, status')
            .eq('email', email)
            .maybeSingle()

        if (fetchError) {
            return { success: false, error: fetchError.message }
        }
        if (!user) {
            return { success: false, error: 'No user found for that email.' }
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'admin', status: 'approved' })
            .eq('id', user.id)

        if (updateError) {
            return { success: false, error: updateError.message }
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error' }
    }
}
