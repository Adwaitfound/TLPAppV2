"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type CalendarEventInput = {
    project_id: string
    event_date: string // YYYY-MM-DD
    title: string
    copy?: string
    platform?: "instagram" | "facebook" | "youtube" | "linkedin"
    content_type?: "reel" | "carousel" | "story" | "static" | "video"
    status?: "idea" | "editing" | "review" | "scheduled" | "published"
    ig_link?: string
    yt_link?: string
    attachments?: Array<{ url: string; kind: string }>
}

export async function createCalendarEvent(input: CalendarEventInput) {
    const supabase = await createClient()
    const { data, error } = await supabase.from("calendar_events").insert({
        project_id: input.project_id,
        event_date: input.event_date,
        title: input.title,
        copy: input.copy,
        platform: input.platform,
        content_type: input.content_type,
        status: input.status ?? "idea",
        ig_link: input.ig_link,
        yt_link: input.yt_link,
        attachments: input.attachments ? JSON.stringify(input.attachments) : JSON.stringify([]),
    }).select("*").single()
    if (error) throw new Error(error.message)
    revalidatePath("/dashboard/projects")
    return data
}

export async function updateCalendarEvent(id: string, patch: Partial<CalendarEventInput>) {
    const supabase = await createClient()
    const { data, error } = await supabase.from("calendar_events").update({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.copy !== undefined && { copy: patch.copy }),
        ...(patch.platform !== undefined && { platform: patch.platform }),
        ...(patch.content_type !== undefined && { content_type: patch.content_type }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.ig_link !== undefined && { ig_link: patch.ig_link }),
        ...(patch.yt_link !== undefined && { yt_link: patch.yt_link }),
        ...(patch.attachments !== undefined && { attachments: JSON.stringify(patch.attachments) }),
    }).eq("id", id).select("*").single()
    if (error) throw new Error(error.message)
    revalidatePath("/dashboard/projects")
    return data
}

export async function deleteCalendarEvent(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from("calendar_events").delete().eq("id", id)
    if (error) throw new Error(error.message)
    revalidatePath("/dashboard/projects")
}

export async function listCalendarEvents(projectId: string, monthISO: string) {
    const supabase = await createClient()
    const start = new Date(monthISO)
    const startISO = new Date(start.getFullYear(), start.getMonth(), 1).toISOString().slice(0, 10)
    const endISO = new Date(start.getFullYear(), start.getMonth() + 1, 0).toISOString().slice(0, 10)
    const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("project_id", projectId)
        .gte("event_date", startISO)
        .lte("event_date", endISO)
        .order("event_date", { ascending: true })
    if (error) throw new Error(error.message)
    return data
}
