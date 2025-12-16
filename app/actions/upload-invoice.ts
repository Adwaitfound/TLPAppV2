"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function uploadInvoiceFile(formData: FormData) {
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Verify user is adwait
    if (user.email !== "adwait@thelostproject.in") {
        return { error: "Access restricted to adwait@thelostproject.in" }
    }

    const file = formData.get("file") as File
    const invoiceNumber = formData.get("invoiceNumber") as string

    if (!file) {
        return { error: "No file provided" }
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        return { error: "Only PDF files are allowed" }
    }

    try {
        const fileName = `${invoiceNumber.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`
        const filePath = `invoices/${fileName}`

        // Upload file using service client (has elevated permissions)
        const { error: uploadError } = await serviceClient.storage
            .from("project-files")
            .upload(filePath, file)

        if (uploadError) {
            console.error("Storage upload error:", uploadError)
            return { error: `Upload failed: ${uploadError.message}` }
        }

        // Get public URL
        const { data: { publicUrl } } = serviceClient.storage
            .from("project-files")
            .getPublicUrl(filePath)

        return {
            success: true,
            filePath,
            publicUrl,
        }
    } catch (error: any) {
        console.error("Upload error:", error)
        return { error: error.message || "Upload failed" }
    }
}
