"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskManager } from "@/components/dashboard/task-manager"
import { StatusBadge } from "@/components/shared/status-badge"
import { FileManager } from "@/components/projects/file-manager"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import {
    Briefcase,
    ListTodo,
    AlertTriangle,
    CalendarClock,
    FolderKanban,
    Calendar,
    Plus,
    ChevronRight,
    AlertCircle,
    TrendingUp,
    Clock,
    Video,
    UserCheck,
    Users,
    CheckSquare,
    File,
} from "lucide-react"
import type { Project, Milestone, SubProject, User, ProjectStatus, ProjectFile } from "@/types"

type ProjectSummary = {
    id: string
    name: string
    status?: ProjectStatus
    deadline?: string | null
    progress_percentage?: number | null
    start_date?: string | null
    description?: string | null
    clients?: { company_name?: string | null }
}

type MilestoneSummary = {
    id: string
    title: string
    due_date?: string | null
    status?: string
    project_id?: string
    projects?: { name?: string | null }
}

export default function EmployeeDashboard() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [projects, setProjects] = useState<ProjectSummary[]>([])
    const [milestones, setMilestones] = useState<MilestoneSummary[]>([])
    const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null)
    const [detailProject, setDetailProject] = useState<Project | null>(null)
    const [detailMilestones, setDetailMilestones] = useState<Milestone[]>([])
    const [detailSubProjects, setDetailSubProjects] = useState<SubProject[]>([])
    const [detailTeam, setDetailTeam] = useState<User[]>([])
    const [detailFiles, setDetailFiles] = useState<ProjectFile[]>([])
    const [teamDebugInfo, setTeamDebugInfo] = useState<{ projectId?: string; viewerId?: string; rows?: number; error?: string }>()
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailUpdating, setDetailUpdating] = useState(false)
    const [overview, setOverview] = useState({
        activeProjects: 0,
        tasksToday: 0,
        overdueTasks: 0,
        upcomingMilestones: 0,
    })

    useEffect(() => {
        async function loadDashboard() {
            if (!user || authLoading) return
            setLoading(true)

            const supabase = createClient()
            const today = new Date().toISOString().split('T')[0]

            try {
                const [createdBy, teamAssignments] = await Promise.all([
                    supabase
                        .from('projects')
                        .select('id,name,status,deadline,progress_percentage,start_date,description,clients(company_name)')
                        .eq('created_by', user.id)
                        .limit(10),
                    supabase
                        .from('project_team')
                        .select('project_id,projects(id,name,status,deadline,progress_percentage,start_date,description,clients(company_name))')
                        .eq('user_id', user.id)
                        .limit(10),
                ])

                const combined: ProjectSummary[] = []
                const primary = (createdBy.data as any[] | null) || []
                const team = ((teamAssignments.data as any[] | null) || []).map((item: any) => item.projects).filter(Boolean)

                const normalizeClient = (p: any): ProjectSummary => ({
                    ...p,
                    clients: Array.isArray(p.clients) ? p.clients[0] : p.clients,
                })

                for (const p of primary) {
                    const norm = normalizeClient(p)
                    if (!combined.find((c) => c.id === norm.id)) combined.push(norm)
                }
                for (const p of team) {
                    const norm = normalizeClient(p)
                    if (!combined.find((c) => c.id === norm.id)) combined.push(norm)
                }

                const projectIds = combined.map((p) => p.id)

                const milestonesPromise = projectIds.length
                    ? supabase
                        .from('milestones')
                        .select('id,title,due_date,status,project_id,projects(name)')
                        .in('project_id', projectIds)
                        .in('status', ['pending', 'in_progress'])
                        .order('due_date', { ascending: true })
                        .limit(5)
                    : Promise.resolve({ data: [] as MilestoneSummary[] })

                const [tasksTodayRes, overdueRes, milestonesRes] = await Promise.all([
                    supabase
                        .from('employee_tasks')
                        .select('id')
                        .eq('user_id', user.id)
                        .or(`due_date.eq.${today},status.eq.in_progress`),
                    supabase
                        .from('employee_tasks')
                        .select('id')
                        .eq('user_id', user.id)
                        .lt('due_date', today)
                        .neq('status', 'completed')
                        .neq('status', 'cancelled'),
                    milestonesPromise,
                ])

                setProjects(combined)
                setMilestones((milestonesRes.data as MilestoneSummary[]) || [])
                setOverview({
                    activeProjects: combined.filter((p) => p.status !== 'completed' && p.status !== 'cancelled').length,
                    tasksToday: tasksTodayRes.data?.length || 0,
                    overdueTasks: overdueRes.data?.length || 0,
                    upcomingMilestones: milestonesRes.data?.length || 0,
                })
            } catch (error) {
                console.error('Failed to load employee dashboard', error)
            } finally {
                setLoading(false)
            }
        }

        loadDashboard()
    }, [user?.id, authLoading])

    useEffect(() => {
        if (detailProject) {
            console.log('[employee-view] detailProject set', {
                id: detailProject.id,
                name: detailProject.name,
                drive_folder_url: (detailProject as any).drive_folder_url,
            })
        }
    }, [detailProject])

    useEffect(() => {
        console.log('[employee-view] detailFiles updated', detailFiles)
    }, [detailFiles])

    useEffect(() => {
        console.log('[employee-view] detailTeam updated', detailTeam)
    }, [detailTeam])

    const loadProjectDetails = async (projectId: string) => {
        setDetailLoading(true)
        const supabase = createClient()

        try {
            console.log('[employee-view] loadProjectDetails start', projectId)
            const { data: projectData } = await supabase
                .from('projects')
                .select('*, clients(company_name)')
                .eq('id', projectId)
                .single()

            if (projectData) {
                console.log('[employee-view] projectData', projectData)
                setDetailProject(projectData as Project)
            }

            const { data: milestonesData } = await supabase
                .from('milestones')
                .select('*')
                .eq('project_id', projectId)
                .order('due_date', { ascending: true })

            if (milestonesData) {
                console.log('[employee-view] milestonesData', milestonesData)
                setDetailMilestones(milestonesData as Milestone[])
            }

            const { data: subProjectsData } = await supabase
                .from('sub_projects')
                .select('*, assigned_user:users!sub_projects_assigned_to_fkey(id, email, full_name)')
                .eq('parent_project_id', projectId)

            if (subProjectsData) {
                console.log('[employee-view] subProjectsData', subProjectsData)
                setDetailSubProjects(subProjectsData as SubProject[])
            }

            const { data: filesData } = await supabase
                .from('project_files')
                .select('id, project_id, file_name, file_url, file_type, file_category, storage_type, file_size, created_at, description')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })

            if (filesData) {
                console.log('[employee-view] filesData', filesData)
                setDetailFiles(filesData as ProjectFile[])
            }

            const { data: teamData, error: teamError } = await supabase
                .from('project_team')
                .select('project_id, user_id, users:users!project_team_user_id_fkey(id, email, full_name, role)')
                .eq('project_id', projectId)

            if (teamError) {
                console.error('[employee-view] team fetch error', { projectId, teamError })
                setTeamDebugInfo({ projectId, viewerId: user?.id, rows: 0, error: teamError.message })
            }

            if (teamData) {
                console.log('[employee-view] raw teamData', teamData)
                const mapped = (teamData as any[]).map((t) => t.users).filter(Boolean) as User[]
                console.log('[employee-view] teamData mapped', mapped)
                setDetailTeam(mapped)
                if (mapped.length === 0) {
                    console.warn('[employee-view] teamData mapped is empty', { projectId, userId: user?.id })
                }
                setTeamDebugInfo({ projectId, viewerId: user?.id, rows: mapped.length, error: undefined })
            }
        } catch (error) {
            console.error('Error loading project details:', error)
            setTeamDebugInfo({ projectId, viewerId: user?.id, rows: 0, error: (error as Error).message })
        } finally {
            setDetailLoading(false)
        }
    }

    const updateSubProjectStatus = async (subProjectId: string, newStatus: ProjectStatus) => {
        setDetailUpdating(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('sub_projects')
                .update({ status: newStatus })
                .eq('id', subProjectId)

            if (!error) {
                setDetailSubProjects(detailSubProjects.map((sp) =>
                    sp.id === subProjectId ? { ...sp, status: newStatus } : sp
                ))

                const subProject = detailSubProjects.find((sp) => sp.id === subProjectId)
                if (subProject && subProject.assigned_to === user?.id) {
                    const projectIdRef = subProject.project_id || subProject.parent_project_id || detailProject?.id
                    if (projectIdRef) {
                        await supabase
                            .from('employee_tasks')
                            .update({ status: newStatus })
                            .eq('project_id', projectIdRef)
                            .eq('user_id', user?.id)
                            .eq('title', subProject.name)
                    }
                }
            }
        } catch (error) {
            console.error('Error updating status:', error)
        } finally {
            setDetailUpdating(false)
        }
    }

    const updateSubProjectProgress = async (subProjectId: string, newProgress: number) => {
        setDetailUpdating(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('sub_projects')
                .update({ progress_percentage: newProgress })
                .eq('id', subProjectId)

            if (!error) {
                setDetailSubProjects(detailSubProjects.map((sp) =>
                    sp.id === subProjectId ? { ...sp, progress_percentage: newProgress } : sp
                ))

                const subProject = detailSubProjects.find((sp) => sp.id === subProjectId)
                if (subProject && subProject.assigned_to === user?.id) {
                    const projectIdRef = subProject.project_id || subProject.parent_project_id || detailProject?.id
                    if (projectIdRef) {
                        await supabase
                            .from('employee_tasks')
                            .update({ progress_percentage: newProgress })
                            .eq('project_id', projectIdRef)
                            .eq('user_id', user?.id)
                            .eq('title', subProject.name)
                    }
                }
            }
        } catch (error) {
            console.error('Error updating progress:', error)
        } finally {
            setDetailUpdating(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
        )
    }

    const recentProjects = projects.slice(0, 5)

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Work</h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1">
                        Welcome back! Here&apos;s an overview of your tasks and projects.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => router.push('/dashboard/projects')} className="w-full sm:w-auto">
                        <FolderKanban className="h-4 w-4 mr-2" />
                        My Projects
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/settings')} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <StatCard title="Active Projects" value={overview.activeProjects.toString()} icon={Briefcase} />
                <StatCard title="Today&apos;s Tasks" value={overview.tasksToday.toString()} icon={ListTodo} />
                <StatCard title="Overdue Tasks" value={overview.overdueTasks.toString()} icon={AlertTriangle} iconClassName="text-amber-500" />
                <StatCard title="Upcoming Milestones" value={overview.upcomingMilestones.toString()} icon={CalendarClock} />
            </div>

            {/* Task Manager */}
            <TaskManager />

            {/* My Projects */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg md:text-xl">My Projects</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Projects you&apos;re currently assigned to</CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="self-start sm:self-auto"
                        onClick={() => router.push('/dashboard/projects')}
                    >
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentProjects.length === 0 ? (
                        <div className="text-center py-8">
                            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground">No projects assigned yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentProjects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedProject(project)
                                        loadProjectDetails(project.id)
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{project.name}</p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {project.clients?.company_name || 'No client'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {project.progress_percentage !== null && project.progress_percentage !== undefined && (
                                            <div className="text-right">
                                                <p className="text-xs font-medium">{project.progress_percentage}%</p>
                                                <Progress value={project.progress_percentage} className="h-1.5 w-16 mt-1" />
                                            </div>
                                        )}
                                        <StatusBadge status={project.status || 'planning'} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Milestones */}
            {milestones.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Milestones</CardTitle>
                        <CardDescription>Important deadlines to track</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {milestones.map((milestone) => (
                                <div
                                    key={milestone.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{milestone.title}</p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {milestone.projects?.name || 'No project'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-medium">
                                            {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString() : 'No date'}
                                        </p>
                                        <Badge variant="outline" className="text-xs mt-1">
                                            {milestone.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Overdue Tasks Alert */}
            {overview.overdueTasks > 0 && (
                <Card className="border-red-500/50 bg-red-500/5">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <CardTitle className="text-red-500">Overdue Tasks</CardTitle>
                        </div>
                        <CardDescription>
                            You have {overview.overdueTasks} task{overview.overdueTasks !== 1 ? 's' : ''} past their due date
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10"
                            onClick={() => router.push('/dashboard/employee?tab=tasks')}
                        >
                            View Overdue Tasks
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Project Details Dialog */}
            <Dialog
                open={!!selectedProject}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedProject(null)
                        setDetailProject(null)
                        setDetailMilestones([])
                        setDetailSubProjects([])
                        setDetailTeam([])
                        setDetailFiles([])
                    }
                }}
            >
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    {selectedProject && (
                        <div className="space-y-6">
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <DialogTitle className="text-2xl">{detailProject?.name || selectedProject.name}</DialogTitle>
                                        <DialogDescription className="mt-2">
                                            Client: {detailProject?.clients?.company_name || selectedProject.clients?.company_name || 'No client'}
                                        </DialogDescription>
                                    </div>
                                    <StatusBadge status={detailProject?.status || selectedProject.status || 'planning'} />
                                </div>
                            </DialogHeader>

                            {detailLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="text-sm text-muted-foreground">Loading project details...</div>
                                </div>
                            ) : detailProject ? (
                                <div className="space-y-6 pb-4">
                                    {/* Project Overview */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Project Overview</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {detailProject.start_date && (
                                                <div className="p-3 rounded-lg border">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Start Date
                                                    </div>
                                                    <p className="font-semibold text-sm">{new Date(detailProject.start_date).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                            {detailProject.deadline && (
                                                <div className="p-3 rounded-lg border">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                        <Clock className="h-3 w-3" />
                                                        Deadline
                                                    </div>
                                                    <p className="font-semibold text-sm">{new Date(detailProject.deadline).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                            <div className="p-3 rounded-lg border">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    Progress
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={detailProject.progress_percentage ?? 0} className="h-2 flex-1" />
                                                    <span className="font-semibold text-sm">{detailProject.progress_percentage ?? 0}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {detailProject.description && (
                                        <div>
                                            <h3 className="font-semibold mb-2">Description</h3>
                                            <p className="text-sm text-muted-foreground">{detailProject.description}</p>
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
                                        {detailSubProjects.length > 0 ? (
                                            <div className="space-y-2">
                                                {detailSubProjects.map((subProject) => (
                                                    <Card key={subProject.id} className="hover:border-primary/50 transition-colors">
                                                        <CardContent className="p-4">
                                                            <div className="space-y-3">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h4 className="font-medium">{subProject.name}</h4>
                                                                            <StatusBadge status={subProject.status || 'planning'} />
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
                                                                    {subProject.assigned_to === user?.id && (
                                                                        <Select
                                                                            value={subProject.status || 'planning'}
                                                                            onValueChange={(value: ProjectStatus) => updateSubProjectStatus(subProject.id, value)}
                                                                            disabled={detailUpdating}
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
                                                                        <Progress value={subProject.progress_percentage ?? 0} className="h-2 flex-1" />
                                                                        <span className="text-xs font-medium w-10 text-right">{subProject.progress_percentage ?? 0}%</span>
                                                                    </div>
                                                                    {subProject.assigned_to === user?.id && (
                                                                        <input
                                                                            type="range"
                                                                            min={0}
                                                                            max={100}
                                                                            step={1}
                                                                            value={subProject.progress_percentage ?? 0}
                                                                            onChange={(e) => updateSubProjectProgress(subProject.id, Number(e.target.value))}
                                                                            className="w-full cursor-pointer"
                                                                            disabled={detailUpdating}
                                                                        />
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
                                        {detailMilestones.length > 0 ? (
                                            <div className="space-y-2">
                                                {detailMilestones.map((milestone) => (
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
                                        {detailTeam.length > 0 ? (
                                            <div className="space-y-2">
                                                {detailTeam.map((member) => (
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
                                                        <div className="mt-2 text-xs">
                                                            Debug: projectId {detailProject?.id || selectedProject.id}, viewer {user?.id}, rows {teamDebugInfo?.rows ?? 'n/a'}{teamDebugInfo?.error ? `, error ${teamDebugInfo.error}` : ''}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>

                                    {/* Project Files */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <File className="h-4 w-4" />
                                                Files
                                            </h3>
                                        </div>
                                        <FileManager
                                            projectId={detailProject.id}
                                            driveFolderUrl={(detailProject as any).drive_folder_url}
                                            onDriveFolderUpdate={(url) => {
                                                console.log('[employee-view] Drive folder updated:', url)
                                                // Refresh project details after drive folder update
                                                if (detailProject.id) {
                                                    loadProjectDetails(detailProject.id)
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-10">
                                    <div className="text-sm text-muted-foreground">Project not found.</div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
