"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Calendar,
    Clock,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    TrendingUp,
    ListTodo,
    Users,
    Video,
    UserCheck,
    CheckSquare
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Project, Milestone, SubProject, User, ProjectStatus } from "@/types"

export default function EmployeeProjectDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [project, setProject] = useState<Project | null>(null)
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [subProjects, setSubProjects] = useState<SubProject[]>([])
    const [teamMembers, setTeamMembers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        loadProjectDetails()
    }, [params.id])

    const loadProjectDetails = async () => {
        if (!params.id) return

        setLoading(true)
        const supabase = createClient()

        try {
            // Load project details
            const { data: projectData } = await supabase
                .from('projects')
                .select('*, clients(company_name)')
                .eq('id', params.id)
                .single()

            if (projectData) {
                setProject(projectData)
            }

            // Load milestones
            const { data: milestonesData } = await supabase
                .from('milestones')
                .select('*')
                .eq('project_id', params.id)
                .order('due_date', { ascending: true })

            if (milestonesData) {
                setMilestones(milestonesData)
            }

            // Load all sub-projects for this project
            const { data: subProjectsData } = await supabase
                .from('sub_projects')
                .select('*, assigned_user:users!sub_projects_assigned_to_fkey(id, email, full_name)')
                .eq('project_id', params.id)

            if (subProjectsData) {
                setSubProjects(subProjectsData)
            }

            // Load team members
            const { data: teamData } = await supabase
                .from('project_team')
                .select('users(id, email, full_name, role)')
                .eq('project_id', params.id)

            if (teamData) {
                const members = teamData.flatMap((t) => {
                    const u = t.users
                    if (!u) return []
                    return Array.isArray(u) ? u : [u]
                }) as User[]
                setTeamMembers(members)
            }
        } catch (error) {
            console.error('Error loading project details:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateSubProjectStatus = async (subProjectId: string, newStatus: ProjectStatus) => {
        setUpdating(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('sub_projects')
                .update({ status: newStatus })
                .eq('id', subProjectId)

            if (!error) {
                setSubProjects(subProjects.map(sp =>
                    sp.id === subProjectId ? { ...sp, status: newStatus } : sp
                ))

                // Also update in employee_tasks if synced
                const subProject = subProjects.find(sp => sp.id === subProjectId)
                if (subProject && subProject.assigned_to === user?.id) {
                    await supabase
                        .from('employee_tasks')
                        .update({ status: newStatus })
                        .eq('project_id', project?.id)
                        .eq('user_id', user?.id)
                        .eq('title', subProject.name)
                }
            }
        } catch (error) {
            console.error('Error updating status:', error)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Project not found</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <StatusBadge status={project.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Client: {project.clients?.company_name || 'No client'}
                    </p>
                </div>
            </div>

            {/* Project Overview */}
            <div>
                <h3 className="font-semibold mb-3">Project Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {project.start_date && (
                        <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Calendar className="h-3 w-3" />
                                Start Date
                            </div>
                            <p className="font-semibold">{new Date(project.start_date).toLocaleDateString()}</p>
                        </div>
                    )}
                    {project.deadline && (
                        <div className="p-3 rounded-lg border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Clock className="h-3 w-3" />
                                Deadline
                            </div>
                            <p className="font-semibold">{new Date(project.deadline).toLocaleDateString()}</p>
                        </div>
                    )}
                    <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="h-3 w-3" />
                            Progress
                        </div>
                        <div className="flex items-center gap-2">
                            <Progress value={project.progress_percentage} className="h-2 flex-1" />
                            <span className="font-semibold text-sm">{project.progress_percentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            {project.description && (
                <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
            )}

            {/* Sub-Projects (Tasks) Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <ListTodo className="h-4 w-4" />
                        Sub-Projects / Tasks
                    </h3>
                </div>
                {subProjects.length > 0 ? (
                    <div className="space-y-2">
                        {subProjects.map((subProject) => (
                            <Card key={subProject.id} className="hover:border-primary/50 transition-colors">
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium">{subProject.name}</h4>
                                                    <StatusBadge status={subProject.status} />
                                                </div>
                                                {subProject.description && (
                                                    <p className="text-sm text-muted-foreground mb-2">{subProject.description}</p>
                                                )}
                                                {subProject.video_url && (
                                                    <div className="mb-2">
                                                        <a
                                                            href={subProject.video_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                        >
                                                            <Video className="h-3 w-3" />
                                                            View Video
                                                        </a>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                    {subProject.assigned_user && (
                                                        <div className="flex items-center gap-1">
                                                            <UserCheck className="h-3 w-3" />
                                                            {subProject.assigned_user.full_name || subProject.assigned_user.email}
                                                        </div>
                                                    )}
                                                    {subProject.due_date && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(subProject.due_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Only show status update dropdown for tasks assigned to current user */}
                                            {subProject.assigned_to === user?.id && (
                                                <Select
                                                    value={subProject.status}
                                                    onValueChange={(value: ProjectStatus) => updateSubProjectStatus(subProject.id, value)}
                                                    disabled={updating}
                                                >
                                                    <SelectTrigger className="w-[130px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="planning">Planning</SelectItem>
                                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                                        <SelectItem value="in_review">In Review</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                        <SelectItem value="stuck">Stuck</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Progress value={subProject.progress_percentage} className="h-2 flex-1" />
                                                <span className="text-xs font-medium w-10 text-right">{subProject.progress_percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No tasks yet for this project.
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Milestones Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Milestones</h3>
                </div>
                {milestones.length > 0 ? (
                    <div className="space-y-2">
                        {milestones.map((milestone) => (
                            <Card key={milestone.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium">{milestone.title}</h4>
                                                <StatusBadge status={milestone.status} />
                                            </div>
                                            {milestone.description && (
                                                <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                                            )}
                                            {milestone.due_date && (
                                                <p className="text-xs text-muted-foreground">
                                                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No milestones yet for this project.
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Team Members */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Team Members</h3>
                </div>
                {teamMembers.length > 0 ? (
                    <div className="space-y-2">
                        {teamMembers.map((member) => (
                            <Card key={member.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-medium">
                                                {member.full_name?.charAt(0) || member.email.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium">{member.full_name || member.email}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{member.role?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No team members assigned yet.
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
