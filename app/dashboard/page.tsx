"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import AdminDashboard from "./admin-view"

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && user) {
            // Redirect based on user role from Supabase
            if (user.role === 'client') {
                router.push('/dashboard/client')
            } else if (user.role === 'employee' || user.role === 'project_manager') {
                router.push('/dashboard/employee')
            }
            // Admin stays on this page (admin-view)
        }
    }, [authLoading, user, router])

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    // Only show admin dashboard for admin role
    if (user?.role === 'admin') {
        return <AdminDashboard />
    }

    // Show loading while redirecting
    return (
        <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Redirecting...</p>
        </div>
    )
}
