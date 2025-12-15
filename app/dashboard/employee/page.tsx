"use client"

import { useAuth } from "@/contexts/auth-context"
import EmployeeDashboard from "./employee-view"

export default function EmployeeDashboardPage() {
    const { loading: authLoading } = useAuth()

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    return <EmployeeDashboard />
}
