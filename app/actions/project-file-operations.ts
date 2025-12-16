"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"

function parseBucketAndPath(fileUrl: string): { bucket: string; path: string } | null {
    try {
        const u = new URL(fileUrl)
        // Expect: /storage/v1/object/<scope>/<bucket>/<path...>
        const parts = u.pathname.split("/").filter(Boolean)
        const idx = parts.findIndex((p) => p === "object")
        if (idx === -1 || idx + 2 >= parts.length) return null
        // scope can be 'public', 'sign', etc.
        const scope = parts[idx + 1]
        const bucket = parts[idx + 2]
        const path = parts.slice(idx + 3).join("/")
        if (!bucket || !path) return null
        return { bucket, path }
    } catch {
        return null
    }
}

function extractStoragePath(fileUrl: string, fallbackBucket = "project-files"): { bucket: string; path: string } {
    const parsed = parseBucketAndPath(fileUrl)
    if (parsed) return parsed
    // Fallback: try to find '/<bucket>/' marker; default to known bucket
    const marker = `${fallbackBucket}/`
    const idx = fileUrl.indexOf(marker)
    const raw = idx >= 0 ? fileUrl.slice(idx + marker.length) : fileUrl
    const path = raw.replace(/^public\//, "").replace(/^\//, "")
    return { bucket: fallbackBucket, path }
}

function ensureAuthEmail(userEmail?: string) {
    if (!userEmail) throw new Error("Unauthorized")
    if (userEmail !== "adwait@thelostproject.in") throw new Error("Access restricted")
}

export async function getSignedProjectFileUrl(fileUrl: string, expiresInSeconds = 3600) {
    const supabase = await createClient()
    const service = createServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: "Unauthorized" }
    try {
        ensureAuthEmail(user.email || undefined)
        const { bucket, path } = extractStoragePath(fileUrl)
        const { data, error } = await service.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
        if (error) throw error
        return { signedUrl: data?.signedUrl }
    } catch (error: any) {
        console.error("Signed URL error:", error)
        return { error: error.message || "Failed to generate signed URL" }
    }
}
