"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, AlertCircle, FolderKanban } from "lucide-react"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

const priorityColors = {
    high: "destructive",
    medium: "default",
    low: "secondary",
} as const

export default function EmployeeDashboard() {
    const { user, loading: authLoading } = useAuth()
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        assignedProjects: 0,
        tasksCompleted: 0,
        hoursLogged: 0,
        overdueTasks: 0,
    })

    useEffect(() => {
        async function fetchEmployeeData() {
            if (!user || authLoading) return

            const supabase = createClient()

            try {
                // Fetch projects (employees can see all projects they're assigned to)
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (projectsError) throw projectsError

                setProjects(projectsData || [])

                // Calculate stats
                setStats({
                    assignedProjects: projectsData?.length || 0,
                    tasksCompleted: 0, // Will be implemented with tasks feature
                    hoursLogged: 0, // Will be implemented with time tracking
                    overdueTasks: 0, // Will be implemented with tasks feature
                })
            } catch (error) {
                console.error('Error fetching employee data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchEmployeeData()
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
            title: "Assigned Projects",
            value: stats.assignedProjects.toString(),
            change: "+2 this week",
            trend: "up" as const,
            icon: FolderKanban,
        },
        {
            title: "Tasks Completed",
            value: stats.tasksCompleted.toString(),
            change: "This week",
            trend: "up" as const,
            icon: CheckCircle2,
        },
        {
            title: "Hours Logged",
            value: stats.hoursLogged.toString(),
            change: "This week",
            trend: "neutral" as const,
            icon: Clock,
        },
        {
            title: "Overdue Tasks",
            value: stats.overdueTasks.toString(),
            change: "Needs attention",
            trend: "down" as const,
            icon: AlertCircle,
        },
    ]

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Employee Dashboard</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Manage your tasks and track your progress
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Assigned Projects */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>My Assigned Projects</CardTitle>
                            <CardDescription>
                                Projects you're currently working on
                            </CardDescription>
                        </div>
                        <Button>
                            <Clock className="h-4 w-4 mr-2" />
                            Log Time
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No projects assigned</p>
                    ) : (
                        <div className="space-y-3">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-medium">{project.name}</h3>
                                            <StatusBadge status={project.status} />
                                        </div>
                                        <p className="text-sm">{project.description || "No description"}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            View
                                        </Button>
                                        <Button size="sm">
                                            Start Work
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks and shortcuts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Button variant="outline" className="justify-start">
                            <Clock className="h-4 w-4 mr-2" />
                            Start Time Tracking
                        </Button>
                        <Button variant="outline" className="justify-start">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Task Complete
                        </Button>
                        <Button variant="outline" className="justify-start">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Report Issue
                        </Button>
                        <Button variant="outline" className="justify-start">
                            <FolderKanban className="h-4 w-4 mr-2" />
                            View All Projects
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
