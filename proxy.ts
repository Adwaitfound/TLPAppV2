// Minimal process typing to avoid depending on @types/node for this proxy file
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

export async function proxy(request: NextRequest) {
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
        console.error('[proxy] Supabase env vars missing')
        return redirectToLogin('supabase-config')
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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
        } as any,
    })

    let user: any = null

    try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
            console.error('[proxy] getUser failed', error.message)
            if (request.nextUrl.pathname.startsWith('/dashboard')) {
                return redirectToLogin('auth')
            }
        } else {
            user = data.user
        }
    } catch (err: any) {
        console.error('[proxy] Unexpected getUser error', err?.message)
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            return redirectToLogin('auth')
        }
    }

    // Protect dashboard routes and enforce role-based access
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        try {
            const { data: userData, error: roleError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (roleError) {
                console.error('[proxy] Role fetch failed', roleError.message)
                return redirectToLogin('role')
            }

            if (userData) {
                const role = userData.role
                const path = request.nextUrl.pathname

                if (role === 'client' && !path.startsWith('/dashboard/client')) {
                    return NextResponse.redirect(new URL('/dashboard/client', request.url))
                }

                if (role === 'project_manager' && !path.startsWith('/dashboard/employee')) {
                    return NextResponse.redirect(new URL('/dashboard/employee', request.url))
                }

                if (
                    role === 'admin' &&
                    (path.startsWith('/dashboard/client/') || path.startsWith('/dashboard/employee/'))
                ) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }

                if (path === '/dashboard') {
                    if (role === 'client') {
                        return NextResponse.redirect(new URL('/dashboard/client', request.url))
                    } else if (role === 'project_manager') {
                        return NextResponse.redirect(new URL('/dashboard/employee', request.url))
                    }
                }
            }
        } catch (err: any) {
            console.error('[proxy] Unexpected role guard error', err?.message)
            return redirectToLogin('role')
        }
    }

    // Allow auth pages to render unchanged
    if (
        request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/signup' ||
        request.nextUrl.pathname === '/auth/select-role'
    ) {
        return supabaseResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
