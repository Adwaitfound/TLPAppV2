'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function forceConfirmEmail(email: string) {
    try {
        const supabase = createServiceClient()
        // Find user id in our users table
        const { data, error } = await supabase
            .from('users')
            .select('id, email, status, role')
            .eq('email', email)
            .limit(1)
            .single()

        if (error) {
            return { success: false, error: error.message }
        }
        let targetUserId = data?.id

        // If not found in users table, fallback to admin listUsers and match by email
        if (!targetUserId) {
            const { data: listData, error: listError } = await (supabase as any).auth.admin.listUsers({ perPage: 200 })
            if (listError) {
                return { success: false, error: listError.message }
            }
            const match = listData?.users?.find((u: any) => (u?.email || '').toLowerCase() === email.toLowerCase())
            if (!match?.id) {
                return { success: false, error: 'User not found for provided email' }
            }
            targetUserId = match.id
        }

        const { error: confirmError } = await (supabase as any).auth.admin.updateUserById(targetUserId, {
            email_confirm: true,
        })
        if (confirmError) {
            return { success: false, error: confirmError.message }
        }

        return { success: true, userId: targetUserId }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error while confirming email' }
    }
}
