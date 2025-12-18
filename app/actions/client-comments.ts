'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit'

async function notifyUsers(userIds: string[], payload: { type: string, message: string, metadata?: Record<string, any> }) {
    if (!userIds.length) return
    const supabase = createServiceClient()
    const { error } = await supabase.from('notifications').insert(
        userIds.map((uid) => ({ user_id: uid, type: payload.type, message: payload.message, metadata: payload.metadata }))
    )
    if (error) console.warn('notifyUsers insert failed', error.message)
}

export async function createProjectComment(params: {
    projectId: string,
    authorUserId: string,
    text: string
}) {
    const { projectId, authorUserId, text } = params
    try {
        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('project_comments')
            .insert({ project_id: projectId, user_id: authorUserId, comment_text: text })
            .select(`id, project_id, user_id, comment_text, status, created_at, assigned_user_id`)
            .single()

        if (error) return { success: false, error: error.message }

        // Fire-and-forget audit log for admins/PMs visibility
        logAuditEvent(
            'create',
            'project_comment',
            data.id,
            authorUserId,
            { project_id: projectId, comment_text: text }
        )

        // Notify all admins/PMs (in-app notification)
        const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('role', ['admin', 'project_manager'])

        const adminIds = (admins || []).map((a: any) => a.id)
        await notifyUsers(adminIds, {
            type: 'comment_created',
            message: `New comment on a project: ${text.slice(0, 80)}`,
            metadata: { project_id: projectId, comment_id: data.id },
        })
        return { success: true, comment: data }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error creating comment' }
    }
}

export async function listProjectComments(projectId: string) {
    try {
        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('project_comments')
            .select(`
                id,
                project_id,
                user_id,
                comment_text,
                status,
                created_at,
                assigned_user_id,
                author:user_id(full_name, email),
                assignee:assigned_user_id(full_name, email)
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
        if (error) return { success: false, error: error.message }
        return { success: true, comments: data || [] }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error listing comments' }
    }
}

export async function assignCommentToEmployee(params: { commentId: string, userId: string }) {
    try {
        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('project_comments')
            .update({ assigned_user_id: params.userId })
            .eq('id', params.commentId)
            .select(`id, assigned_user_id, assignee:assigned_user_id(full_name, email)`)
            .single()
        if (error) return { success: false, error: error.message }

        logAuditEvent(
            'assign',
            'project_comment',
            params.commentId,
            params.userId,
            { assigned_user_id: params.userId }
        )

        // Notify admins/PMs and the assigned employee
        const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('role', ['admin', 'project_manager'])
        const targetIds = new Set<string>((admins || []).map((a: any) => a.id))
        if (params.userId) targetIds.add(params.userId)
        await notifyUsers(Array.from(targetIds), {
            type: 'comment_assigned',
            message: 'A comment was assigned',
            metadata: { comment_id: params.commentId, assigned_user_id: params.userId },
        })
        return { success: true, comment: data }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error assigning comment' }
    }
}

export async function clientApproveProject(params: { projectId: string }) {
    try {
        const supabase = createServiceClient()
        const { error } = await supabase
            .from('projects')
            .update({ client_approved: true, client_approved_at: new Date().toISOString() })
            .eq('id', params.projectId)
        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error approving project' }
    }
}

export async function adminApproveProject(params: { projectId: string }) {
    try {
        const supabase = createServiceClient()
        const { error } = await supabase
            .from('projects')
            .update({ client_approved: true, client_approved_at: new Date().toISOString() })
            .eq('id', params.projectId)
        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error approving project (admin)' }
    }
}
