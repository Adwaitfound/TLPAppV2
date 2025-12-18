import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client (cookie-aware). Async to support Next 16 cookies() Promise API.
export async function createClient() {
  const cookieStore = await (cookies() as any)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore?.get?.(name)
          return (cookie?.value ?? undefined) as string | undefined
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore?.set?.(name, value, options)
          } catch {
            // Ignore if called in a Server Component without mutable cookies
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore?.set?.(name, '', { ...(options || {}), maxAge: 0 })
          } catch {
            // Ignore if called in a Server Component without mutable cookies
          }
        },
      },
    }
  )
}

// Service role client for server actions that need elevated permissions
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}



