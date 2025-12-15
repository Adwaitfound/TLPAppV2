"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    View insights and performance metrics
                </p>
            </div>

            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                        Advanced analytics and reporting features will be available here once you start adding projects and invoices to your workspace.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
