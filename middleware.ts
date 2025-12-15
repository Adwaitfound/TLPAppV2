import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser()

    // Protect dashboard routes and enforce role-based access
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Fetch user role to enforce access
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

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
    }

    // Redirect to appropriate dashboard if already logged in
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/auth/select-role') {
        if (user) {
            // Fetch user role
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (userData) {
                if (userData.role === 'admin') {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                } else if (userData.role === 'client') {
                    return NextResponse.redirect(new URL('/dashboard/client', request.url))
                } else {
                    return NextResponse.redirect(new URL('/dashboard/employee', request.url))
                }
            }
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
