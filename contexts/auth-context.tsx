"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

type UserRole = "admin" | "employee" | "client" | "project_manager"

interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    avatar_url?: string
    company_name?: string
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

    useEffect(() => {
        // Check active sessions and sets the user
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                setSupabaseUser(session.user)
                // Fetch user data from users table
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                if (userData) {
                    setUser(userData)
                }
            }
            setLoading(false)
        }

        initAuth()

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setSupabaseUser(session.user)
                // Fetch user data from users table
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                if (userData) {
                    setUser(userData)
                }
            } else {
                setSupabaseUser(null)
                setUser(null)
            }
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSupabaseUser(null)
        router.push("/")
        router.refresh()
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
