"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { debug } from "@/lib/debug"

type UserRole = "admin" | "employee" | "client" | "project_manager"

interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    avatar_url?: string
    company_name?: string
    phone?: string
    bio?: string
    website?: string
    industry?: string
    address?: string
    tax_id?: string
    company_size?: string
}

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    setUser: (user: User | null) => void
    logout: () => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    const ensureUserProfile = async (sessionUser: SupabaseUser) => {
        const derivedRole = (sessionUser.user_metadata?.role as UserRole) || 'project_manager'
        const derivedName = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User'

        debug.log('AUTH', 'Fetching user profile from users table...', { userId: sessionUser.id })
        const { data: usersData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', sessionUser.id)

        if (error) {
            debug.error('AUTH', 'Failed to fetch user profile', { message: error.message, code: error.code })
            return null
        }

        if (usersData && usersData.length > 0) {
            debug.success('AUTH', 'User profile loaded', { email: usersData[0].email, role: usersData[0].role })
            return usersData[0]
        }

        debug.warn('AUTH', 'User profile missing, creating default profile', {
            userId: sessionUser.id,
            email: sessionUser.email,
            role: derivedRole,
        })

        const { error: insertError } = await supabase
            .from('users')
            .insert({
                id: sessionUser.id,
                email: sessionUser.email,
                full_name: derivedName,
                role: derivedRole,
            })

        if (insertError) {
            debug.error('AUTH', 'Failed to create user profile', { message: insertError.message, code: insertError.code })
            return null
        }

        const { data: createdProfile, error: refetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', sessionUser.id)

        if (refetchError) {
            debug.error('AUTH', 'Profile created but refetch failed', { message: refetchError.message, code: refetchError.code })
            return null
        }

        const profile = createdProfile?.[0] || null
        if (profile) {
            debug.success('AUTH', 'User profile created', { email: profile.email, role: profile.role })
        }
        return profile
    }

    useEffect(() => {
        // Check active sessions and sets the user
        const initAuth = async () => {
            try {
                debug.log('AUTH', 'Initializing auth context...')
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                if (sessionError) {
                    debug.error('AUTH', 'Failed to fetch session', { message: sessionError.message, code: sessionError.code })
                }
                console.log('Auth context init: session user:', session?.user?.email)
                debug.log('AUTH', 'Session fetched', { email: session?.user?.email, userId: session?.user?.id })

                if (session?.user) {
                    setSupabaseUser(session.user)
                    const profile = await ensureUserProfile(session.user)
                    if (profile) {
                        setUser(profile)
                    }
                } else {
                    debug.log('AUTH', 'No active session found')
                }
            } catch (err: any) {
                console.error('Auth context init error:', err.message)
                debug.error('AUTH', 'Init error', { message: err.message })
            } finally {
                setLoading(false)
                debug.log('AUTH', 'Auth init complete')
            }
        }

        initAuth()

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change event:', event, 'user:', session?.user?.email)
            debug.log('AUTH', 'Auth state changed', { event, email: session?.user?.email, userId: session?.user?.id })

            if (session?.user) {
                setSupabaseUser(session.user)
                const profile = await ensureUserProfile(session.user)

                if (profile) {
                    setUser(profile)
                } else {
                    setUser(null)
                }
            } else {
                debug.log('AUTH', 'Session cleared, setting user to null')
                setSupabaseUser(null)
                setUser(null)
            }
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase])

    useEffect(() => {
        if (!supabaseUser?.id) return

        // Keep user profile (including role) in sync with DB changes
        const channel = supabase
            .channel(`user-updates-${supabaseUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${supabaseUser.id}`,
                },
                (payload) => {
                    const nextUser = (payload.new as any) || null
                    if (nextUser) {
                        setUser(nextUser)
                        debug.log('AUTH', 'User profile updated from DB change', { role: nextUser.role })
                    }
                },
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, supabaseUser?.id])

    const logout = async () => {
        debug.log('AUTH', 'Logout initiated', { currentUser: user?.email })
        setUser(null)
        setSupabaseUser(null)
        debug.log('AUTH', 'User state cleared')
        await supabase.auth.signOut()
        debug.success('AUTH', 'Supabase signOut complete')
        router.push("/")
        debug.log('AUTH', 'Redirecting to login...')
        router.refresh()
        debug.log('AUTH', 'Logout complete')
    }

    return (
        <AuthContext.Provider value={{ user, supabaseUser, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
