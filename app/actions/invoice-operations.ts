"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"

function extractStoragePath(fileUrl: string) {
    const marker = "project-files/"
    const idx = fileUrl.indexOf(marker)
    const raw = idx >= 0 ? fileUrl.slice(idx + marker.length) : fileUrl
    return raw.replace(/^public\//, "").replace(/^\//, "")
}

export async function fetchInvoicesData() {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Verify user is adwait
    if (user.email !== "adwait@thelostproject.in") {
        return { error: "Access restricted to adwait@thelostproject.in" }
    }

    try {
        // Fetch invoices with related data
        const { data: invoicesData, error: invoicesError } = await supabase
            .from("invoices")
            .select("*, clients(company_name), projects(name)")
            .order("created_at", { ascending: false })

        if (invoicesError) throw invoicesError

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
            .from("clients")
            .select("*")
            .order("company_name")

        if (clientsError) throw clientsError

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
            .from("projects")
            .select("*")
            .order("name")

        if (projectsError) throw projectsError

        return {
            invoices: invoicesData || [],
            clients: clientsData || [],
            projects: projectsData || [],
        }
    } catch (error: any) {
        console.error("Fetch error:", error)
        return { error: error.message || "Failed to fetch data" }
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Verify user is adwait
    if (user.email !== "adwait@thelostproject.in") {
        return { error: "Access restricted to adwait@thelostproject.in" }
    }

    try {
        const { data, error } = await supabase
            .from("invoices")
            .update({ status })
            .eq("id", invoiceId)
            .select("*, clients(company_name), projects(name)")
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (error: any) {
        console.error("Update error:", error)
        return { error: error.message || "Failed to update invoice" }
    }
}

export async function deleteInvoice(invoiceId: string, fileUrl: string) {
    const supabase = await createClient()
    const service = createServiceClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Verify user is adwait
    if (user.email !== "adwait@thelostproject.in") {
        return { error: "Access restricted to adwait@thelostproject.in" }
    }

    try {
        // Delete file from storage
        const path = extractStoragePath(fileUrl)
        await service.storage.from("project-files").remove([path])

        // Delete from database
        const { error } = await supabase.from("invoices").delete().eq("id", invoiceId)
        if (error) throw error

        return { success: true }
    } catch (error: any) {
        console.error("Delete error:", error)
        return { error: error.message || "Failed to delete invoice" }
    }
}

export async function getSignedInvoiceUrl(fileUrl: string) {
    const supabase = await createClient()
    const service = createServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }
    if (user.email !== "adwait@thelostproject.in") return { error: "Access restricted to adwait@thelostproject.in" }

    try {
        const path = extractStoragePath(fileUrl)
        const { data, error } = await service.storage.from("project-files").createSignedUrl(path, 3600)
        if (error) throw error
        return { signedUrl: data?.signedUrl }
    } catch (error: any) {
        console.error("Signed URL error:", error)
        return { error: error.message || "Failed to generate signed URL" }
    }
}
