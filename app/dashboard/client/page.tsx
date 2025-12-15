"use client"

import { useAuth } from "@/contexts/auth-context"
import ClientDashboard from "./client-view"

export default function ClientDashboardPage() {
    const { loading: authLoading } = useAuth()

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return <ClientDashboard />
}
