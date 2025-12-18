"use server"

import { createServiceClient } from '@/lib/supabase/server'

// Server-side audit logging helper
export async function logAuditEvent(action: string, entity: string, entityId: string, userId: string, metadata?: any) {
    // This is a placeholder for server-side audit logging
    // In production, you would write to an audit_logs table
    const supabase = createServiceClient()
    await supabase.from('audit_logs').insert({
        action,
        entity_type: entity,
        entity_id: entityId,
        user_id: userId,
        metadata: metadata || {}
    })
}
