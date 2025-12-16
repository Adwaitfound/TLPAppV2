import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    if (process.env.NODE_ENV === 'development') {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        // Safe debug: log only first 8 chars of key to verify correct key is loaded
        // This helps diagnose Invalid API key issues without exposing secrets.
        console.log('[Supabase] URL:', url, 'ANON key:', anon ? anon.slice(0, 8) + '…' : 'missing')
    }
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// Legacy export for backward compatibility
export const supabase = createClient()
