"use client"

import { useAuth } from "@/contexts/auth-context"
import AdminDashboard from "./admin-view"

export default function DashboardPage() {
    const { loading: authLoading } = useAuth()

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return <AdminDashboard />
}
