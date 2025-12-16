"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { MilestoneStatus } from "@/types"

function ensureAuthEmail(userEmail?: string) {
    if (!userEmail) throw new Error("Unauthorized")
    if (userEmail !== "adwait@thelostproject.in") throw new Error("Access restricted")
}

export async function createMilestone(payload: {
    project_id: string
    title: string
    description?: string
    due_date?: string | null
    status?: MilestoneStatus
}) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }
    try {
        ensureAuthEmail(user.email || undefined)
        const service = createServiceClient()
        const { data, error } = await service
            .from("milestones")
            .insert({
                project_id: payload.project_id,
                title: payload.title,
                description: payload.description || null,
                due_date: payload.due_date || null,
                status: payload.status || "pending",
                created_by_email: user.email,
            })
            .select("*")
            .single()
        if (error) throw error
        return { data }
    } catch (error: any) {
        return { error: error.message || "Failed to create milestone" }
    }
}

export async function updateMilestoneStatus(id: string, status: MilestoneStatus) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }
    try {
        ensureAuthEmail(user.email || undefined)
        const service = createServiceClient()
        const { data, error } = await service
            .from("milestones")
            .update({ status })
            .eq("id", id)
            .select("*")
            .single()
        if (error) throw error
        return { data }
    } catch (error: any) {
        return { error: error.message || "Failed to update milestone" }
    }
}

export async function deleteMilestone(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }
    try {
        ensureAuthEmail(user.email || undefined)
        const service = createServiceClient()
        const { error } = await service.from("milestones").delete().eq("id", id)
        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { error: error.message || "Failed to delete milestone" }
    }
}

export async function reorderMilestones(projectId: string, orderedIds: string[]) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }
    try {
        ensureAuthEmail(user.email || undefined)
        const service = createServiceClient()
        const updates = orderedIds.map((id, idx) => ({ id, position: idx, project_id: projectId }))
        const { error } = await service.from("milestones").upsert(updates, { onConflict: "id" })
        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { error: error.message || "Failed to reorder milestones" }
    }
}
