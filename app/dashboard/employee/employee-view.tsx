"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderKanban, Upload, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export default function EmployeeDashboard() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [projects, setProjects] = useState<any[]>([])
    const [milestones, setMilestones] = useState<any[]>([])
    const [comments, setComments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        assignedProjects: 0,
        inProgressProjects: 0,
        pendingMilestones: 0,
        unreadComments: 0,
    })

    useEffect(() => {
        async function fetchEmployeeData() {
            if (!user || authLoading) return

            const supabase = createClient()

            try {
                // Fetch projects assigned to this user (created_by)
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false })

                if (projectsError) throw projectsError

                // Fetch milestones for these projects
                const projectIds = projectsData?.map(p => p.id) || []
                const { data: milestonesData, error: milestonesError } = await supabase
                    .from('milestones')
                    .select('*, projects(name)')
                    .in('project_id', projectIds)
                    .order('due_date', { ascending: true })
                    .limit(5)

                if (milestonesError) throw milestonesError

                // Fetch recent comments
                const { data: commentsData, error: commentsError } = await supabase
                    .from('project_comments')
                    .select('*, projects(name), users(full_name)')
                    .in('project_id', projectIds)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (commentsError) throw commentsError

                setProjects(projectsData || [])
                setMilestones(milestonesData || [])
                setComments(commentsData || [])

                // Calculate stats
                const inProgressCount = projectsData?.filter(p => p.status === 'in_progress')?.length || 0
                const pendingMilestonesCount = milestonesData?.filter(m => m.status === 'pending' || m.status === 'in_progress')?.length || 0

                setStats({
                    assignedProjects: projectsData?.length || 0,
                    inProgressProjects: inProgressCount,
                    pendingMilestones: pendingMilestonesCount,
                    unreadComments: commentsData?.length || 0,
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
            change: `${stats.inProgressProjects} in progress`,
            trend: "neutral" as const,
            icon: FolderKanban,
        },
        {
            title: "Pending Tasks",
            value: stats.pendingMilestones.toString(),
            change: "Milestones to complete",
            trend: "neutral" as const,
            icon: Clock,
        },
        {
            title: "Client Feedback",
            value: stats.unreadComments.toString(),
            change: "Pending responses",
            trend: stats.unreadComments > 0 ? "down" as const : "neutral" as const,
            icon: MessageSquare,
        },
        {
            title: "Completed",
            value: (stats.assignedProjects - stats.inProgressProjects).toString(),
            change: "Projects delivered",
            trend: "up" as const,
            icon: CheckCircle2,
        },
    ]

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
                    <p className="text-muted-foreground">
                        Manage your assigned projects and tasks
                    </p>
                </div>
                <Button onClick={() => router.push('/dashboard/projects')}>
                    <FolderKanban className="h-4 w-4 mr-2" />
                    View All Projects
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Active Projects */}
                <Card>
                    <CardHeader>
                        <CardTitle>Active Projects</CardTitle>
                        <CardDescription>Projects you're currently working on</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projects.filter(p => p.status === 'in_progress').length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No active projects</p>
                        ) : (
                            <div className="space-y-4">
                                {projects.filter(p => p.status === 'in_progress').slice(0, 3).map((project) => (
                                    <div key={project.id} className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium">{project.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {project.clients?.company_name}
                                                </p>
                                            </div>
                                            <StatusBadge status={project.status} />
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all"
                                                        style={{ width: `${project.progress_percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{project.progress_percentage}%</span>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/projects/${project.id}/upload`)
                                            }}>
                                                <Upload className="h-4 w-4 mr-1" />
                                                Upload
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Milestones */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Milestones</CardTitle>
                        <CardDescription>Tasks and deadlines to track</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {milestones.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No milestones</p>
                        ) : (
                            <div className="space-y-3">
                                {milestones.map((milestone) => (
                                    <div key={milestone.id} className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{milestone.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {milestone.projects?.name}
                                                </p>
                                            </div>
                                            <StatusBadge status={milestone.status} />
                                        </div>
                                        {milestone.due_date && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Client Feedback */}
            <Card>
                <CardHeader>
                    <CardTitle>Client Feedback</CardTitle>
                    <CardDescription>Recent comments and requests from clients</CardDescription>
                </CardHeader>
                <CardContent>
                    {comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No pending feedback</p>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            <p className="font-medium text-sm">{comment.users?.full_name}</p>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <p className="text-xs text-muted-foreground">{comment.projects?.name}</p>
                                        </div>
                                        <StatusBadge status={comment.status} />
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{comment.comment_text}</p>
                                    <div className="flex gap-2 mt-3">
                                        <Button size="sm" variant="outline">Reply</Button>
                                        <Button size="sm" variant="ghost">Mark Resolved</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* All Projects Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Assigned Projects</CardTitle>
                    <CardDescription>Complete list of your projects</CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No projects assigned</p>
                    ) : (
                        <div className="space-y-2">
                            {projects.map((project) => (
                                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex-1">
                                            <p className="font-medium">{project.name}</p>
                                            <p className="text-sm text-muted-foreground">{project.clients?.company_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${project.progress_percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-10">{project.progress_percentage}%</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={project.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
