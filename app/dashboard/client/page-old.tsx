"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, FolderKanban, MessageSquare, Download } from "lucide-react"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export default function ClientDashboard() {
    const { user, loading: authLoading } = useAuth()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        activeProjects: 0,
        pendingReviews: 0,
        messages: 0,
    })

    useEffect(() => {
        async function fetchClientData() {
            if (!user || authLoading) return

            const supabase = createClient()

            try {
                // Fetch projects for this client
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (projectsError) throw projectsError

                setProjects(projectsData || [])

                // Calculate stats
                const activeCount = projectsData?.filter(p => p.status === 'in_progress')?.length || 0
                const reviewCount = projectsData?.filter(p => p.status === 'in_review')?.length || 0

                setStats({
                    activeProjects: projectsData?.length || 0,
                    pendingReviews: reviewCount,
                    messages: 0, // Will be implemented with messages feature
                })
            } catch (error) {
                console.error('Error fetching client data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchClientData()
    }, [user, authLoading])

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    const statsCards = [
        {
            title: "Active Projects",
            value: stats.activeProjects.toString(),
            change: "+1 this month",
            trend: "up" as const,
            icon: FolderKanban,
        },
        {
            title: "Pending Reviews",
            value: stats.pendingReviews.toString(),
            change: "Awaiting feedback",
            trend: "neutral" as const,
            icon: FileText,
        },
        {
            title: "Messages",
            value: stats.messages.toString(),
            change: "2 unread",
            trend: "neutral" as const,
            icon: MessageSquare,
        },
    ]
    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Client Dashboard</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Track your projects and communicate with your production team
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {statsCards.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* My Projects */}
            <Card>
                <CardHeader>
                    <CardTitle>My Projects</CardTitle>
                    <CardDescription>
                        View and manage your active video production projects
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No projects found</p>
                    ) : (
                        <div className="space-y-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
                                >
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-medium">{project.name}</h3>
                                            <StatusBadge status={project.status} />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {project.description || "No description"}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-muted rounded-full h-2 max-w-[200px]">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all"
                                                    style={{ width: `${project.budget_spent && project.budget ? (project.budget_spent / project.budget * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {project.budget_spent && project.budget ? Math.round(project.budget_spent / project.budget * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            View Details
                                        </Button>
                                        <Button size="sm">
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Message
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
