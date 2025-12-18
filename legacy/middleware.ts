// Minimal process typing to avoid depending on @types/node for this middleware file
declare const process: { env: Record<string, string | undefined> }

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type SupabaseCookie = {
    name: string
    value: string
    options?: {
        domain?: string
        maxAge?: number
        expires?: Date
        path?: string
        sameSite?: 'lax' | 'strict' | 'none'
        httpOnly?: boolean
        secure?: boolean
    }
}

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const redirectToLogin = (reason: string) => {
        if (request.nextUrl.pathname.startsWith('/login')) return NextResponse.next()
        const url = new URL('/login', request.url)
        url.searchParams.set('error', reason)
        return NextResponse.redirect(url)
    }

    if (!supabaseUrl || !supabaseAnon) {
        console.error('[middleware] Supabase env vars missing')
        return redirectToLogin('supabase-config')
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnon,
        {
            cookies: {
                get: (name: string) => request.cookies.get(name)?.value,
                set: (name: string, value: string, options?: SupabaseCookie['options']) => {
                    supabaseResponse = NextResponse.next({ request })
                    supabaseResponse.cookies.set(name, value, options as any)
                },
                remove: (name: string, options?: SupabaseCookie['options']) => {
                    supabaseResponse = NextResponse.next({ request })
                    supabaseResponse.cookies.set(name, '', { ...(options as any), maxAge: 0 })
                },
            },
        }
    )

    let user = null as any

    try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
            console.error('[middleware] getUser failed', error.message)
            // Only redirect to login if trying to access protected routes; allow public pages
            if (request.nextUrl.pathname.startsWith('/dashboard')) {
                return redirectToLogin('auth')
            }
        } else {
            user = data.user
        }
    } catch (err: any) {
        console.error('[middleware] Unexpected getUser error', err?.message)
        // Only redirect if accessing protected routes
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            return redirectToLogin('auth')
        }
    }

    // Protect dashboard routes and enforce role-based access
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Fetch user role to enforce access
        try {
            const { data: userData, error: roleError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (roleError) {
                console.error('[middleware] Role fetch failed', roleError.message)
                return redirectToLogin('role')
            }

            if (userData) {
                const role = userData.role
                const path = request.nextUrl.pathname

                // Redirect clients trying to access admin/employee routes
                if (role === 'client' && !path.startsWith('/dashboard/client')) {
                    return NextResponse.redirect(new URL('/dashboard/client', request.url))
                }

                // Redirect employees trying to access admin/client routes
                if (role === 'project_manager' && !path.startsWith('/dashboard/employee')) {
                    return NextResponse.redirect(new URL('/dashboard/employee', request.url))
                }

                // Redirect admin trying to access client/employee specific routes
                if (role === 'admin' && (path.startsWith('/dashboard/client/') || path.startsWith('/dashboard/employee/'))) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }

                // Redirect /dashboard to correct role-specific dashboard
                if (path === '/dashboard') {
                    if (role === 'client') {
                        return NextResponse.redirect(new URL('/dashboard/client', request.url))
                    } else if (role === 'project_manager') {
                        return NextResponse.redirect(new URL('/dashboard/employee', request.url))
                    }
                    // Admin stays at /dashboard
                }
            }
        } catch (err: any) {
            console.error('[middleware] Unexpected role guard error', err?.message)
            return redirectToLogin('role')
        }
    }

    // Do NOT auto-redirect away from auth pages.
    // Let the login/signup pages render even if a session exists
    // so users can switch accounts intentionally.
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/auth/select-role') {
        return supabaseResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - _next/data (server actions and data fetching)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * - images and other static assets
         */
        '/((?!_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
