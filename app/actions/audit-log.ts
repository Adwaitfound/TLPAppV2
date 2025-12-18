"use server"

import { createClient } from "@/lib/supabase/server"

export interface AuditLogData {
    action: 'create' | 'update' | 'delete' | 'view' | 'upload' | 'download' | 'login' | 'logout' | 'approve' | 'reject'
    entityType: 'task' | 'project' | 'file' | 'user' | 'proposal' | 'team_member'
    entityId?: string
    entityName?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    details?: Record<string, any>
    status?: 'success' | 'error' | 'pending'
    errorMessage?: string
    durationMs?: number
}

/**
 * Log an audit event to the database
 * This tracks all user actions for compliance and debugging
 */
export async function logAuditEvent(data: AuditLogData) {
    // Validate input
    if (!data || !data.action || !data.entityType) {
        console.error('[logAuditEvent] Invalid data:', data)
        return { success: false, error: 'Invalid audit data' }
    }

    const startTime = Date.now()
    try {
        const supabase = await createClient()
        if (!supabase) {
            throw new Error('Failed to create Supabase client')
        }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[logAuditEvent] No user authenticated')
            return { success: false, error: 'Not authenticated' }
        }

        // Get user details
        const { data: userData } = await supabase
            .from('users')
            .select('email, role')
            .eq('id', user.id)
            .single()

        // Get request headers for IP and user agent
        const headers = await getRequestHeaders()

        const durationMs = data.durationMs || (Date.now() - startTime)
        // Sanitize data to prevent injection
        const sanitizedDetails = data.details ?
            JSON.parse(JSON.stringify(data.details).substring(0, 10000)) : null


        // Insert audit log
        const { error: logError } = await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                user_email: userData?.email || user.email,
                action: data.action,
                entity_type: data.entityType,
                entity_id: data.entityId,
                entity_name: data.entityName?.substring(0, 500), // Limit length
                old_values: data.oldValues || null,
                new_values: data.newValues || null,
                details: sanitizedDetails,
                ip_address: headers.ip,
                user_agent: headers.userAgent,
                status: data.status || 'success',
                error_message: data.errorMessage?.substring(0, 1000), // Limit length
                duration_ms: durationMs,
            })

        if (logError) {
            console.error('[logAuditEvent] Failed to log:', logError)
            // Don't fail the main operation if logging fails
            return { success: false, error: logError.message }
        }

        console.log('[logAuditEvent] ✅ Logged:', data.action, data.entityType, data.entityName)

        // Optionally sync to Google Sheets (async, non-blocking)
        try {
            await syncToGoogleSheets({
                user: userData?.email || user.email,
                role: userData?.role || 'unknown',
                action: data.action,
                entityType: data.entityType,
                entityName: data.entityName || '',
                timestamp: new Date().toISOString(),
                details: sanitizedDetails || {},
                status: data.status || 'success',
                errorMessage: data.errorMessage || '',
            })
        } catch (sheetsError) {
            // Log but don't fail - Google Sheets is optional
            console.warn('[logAuditEvent] Failed to sync to Sheets:', sheetsError)
        }

        return { success: true }
    } catch (error) {
        console.error('[logAuditEvent] Error:', error)
        return { success: false, error: String(error) }
    }
}

/**
 * Get request headers for IP and user agent
 */
async function getRequestHeaders() {
    // This would need to be passed from middleware in a real implementation
    // For now, return defaults
    return {
        ip: 'unknown',
        userAgent: 'unknown',
    }
}

/**
 * Sync audit log to Google Sheets using Service Account
 * Automatically appends new log entries to the configured Google Sheet
 */
async function syncToGoogleSheets(logData: any) {
    const sheetsId = process.env.GOOGLE_SHEETS_ID
    const serviceAccountEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY

    if (!sheetsId || !serviceAccountEmail || !privateKey) {
        // Google Sheets not configured, skip silently
        return
    }

    try {
        // Create JWT for Google OAuth
        const now = Math.floor(Date.now() / 1000)
        const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
        const jwtClaim = Buffer.from(
            JSON.stringify({
                iss: serviceAccountEmail,
                scope: 'https://www.googleapis.com/auth/spreadsheets',
                aud: 'https://oauth2.googleapis.com/token',
                exp: now + 3600,
                iat: now,
            })
        ).toString('base64url')

        // Sign JWT (simplified - in production use jose or similar library)
        const crypto = await import('crypto')
        const sign = crypto.createSign('RSA-SHA256')
        sign.update(`${jwtHeader}.${jwtClaim}`)
        const signature = sign.sign(privateKey.replace(/\\n/g, '\n'), 'base64url')
        const jwt = `${jwtHeader}.${jwtClaim}.${signature}`

        // Get access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }),
        })

        if (!tokenResponse.ok) {
            throw new Error('Failed to get access token')
        }

        const { access_token } = await tokenResponse.json()

        // Append row to Google Sheet
        const range = 'Sheet1!A:I'
        const values = [
            [
                logData.timestamp || new Date().toISOString(),
                logData.user || '',
                logData.role || '',
                logData.action || '',
                logData.entityType || '',
                logData.entityName || '',
                typeof logData.details === 'object' ? JSON.stringify(logData.details) : logData.details || '',
                logData.status || 'success',
                logData.errorMessage || '',
            ],
        ]

        const appendResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${range}:append?valueInputOption=RAW`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values,
                    majorDimension: 'ROWS',
                }),
            }
        )

        if (!appendResponse.ok) {
            const error = await appendResponse.json()
            throw new Error(`Google Sheets API error: ${error.error?.message || appendResponse.statusText}`)
        }

        console.log('[syncToGoogleSheets] ✅ Synced to Google Sheets')
    } catch (error: any) {
        console.warn('[syncToGoogleSheets] Warning:', error.message)
        // Don't throw - this is optional and shouldn't break main logging
    }
}

/**
 * Get audit logs for admin dashboard
 */
export async function getAuditLogs(filters?: {
    userId?: string
    action?: string
    entityType?: string
    fromDate?: string
    toDate?: string
    limit?: number
}) {
    const supabase = await createClient()

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { error: 'Not authenticated' }
        }

        // Check if user is admin or project manager
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || !['admin', 'project_manager'].includes(userData.role)) {
            return { error: 'Insufficient permissions' }
        }

        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })

        if (filters?.userId) {
            query = query.eq('user_id', filters.userId)
        }
        if (filters?.action) {
            query = query.eq('action', filters.action)
        }
        if (filters?.entityType) {
            query = query.eq('entity_type', filters.entityType)
        }
        if (filters?.fromDate) {
            query = query.gte('created_at', filters.fromDate)
        }
        if (filters?.toDate) {
            query = query.lte('created_at', filters.toDate)
        }

        const limit = Math.min(filters?.limit || 100, 1000)
        query = query.limit(limit)

        const { data, error } = await query

        if (error) {
            console.error('[getAuditLogs] Error:', error)
            return { error: error.message }
        }

        return { data, count: data?.length || 0 }
    } catch (error) {
        console.error('[getAuditLogs] Error:', error)
        return { error: String(error) }
    }
}
