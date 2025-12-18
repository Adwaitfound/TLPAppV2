"use server"

import { createServiceClient } from '@/lib/supabase/server'

export async function markAllNotificationsRead(userId: string) {
    const supabase = createServiceClient()
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
    if (error) return { success: false, error: error.message }
    return { success: true }
}
