"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, CheckCircle2, Circle, AlertCircle, Trash2 } from "lucide-react"
import { createTask, updateTask, deleteTask, getTodayTasks, getOverdueTasks } from "@/app/actions/employee-tasks"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
}

const statusIcons = {
    todo: Circle,
    in_progress: AlertCircle,
    completed: CheckCircle2,
    blocked: AlertCircle,
    cancelled: Circle
}

export function TaskManager() {
    const [tasks, setTasks] = useState<any[]>([])
    const [overdueTasks, setOverdueTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [projectOptions, setProjectOptions] = useState<{ id: string, name: string }[]>([])
    const [projectLoading, setProjectLoading] = useState(false)
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium" as 'low' | 'medium' | 'high' | 'urgent',
        due_date: "",
        project_id: "",
        proposed_project_name: "",
        proposed_project_vertical: "" as 'video_production' | 'social_media' | 'design_branding' | ""
    })
    const [proposeNewProject, setProposeNewProject] = useState(false)

    useEffect(() => {
        console.log('[TaskManager] Component mounted, loading tasks...')
        loadTasks()
        loadProjects()
    }, [])

    useEffect(() => {
        console.log('[TaskManager] Tasks state changed:', tasks)
        console.log('[TaskManager] Overdue tasks state changed:', overdueTasks)
    }, [tasks, overdueTasks])

    async function loadProjects() {
        setProjectLoading(true)
        const supabase = createClient()

        try {
            const [{ data: createdBy }, { data: teamAssignments }] = await Promise.all([
                supabase
                    .from('projects')
                    .select('id, name')
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase
                    .from('project_team')
                    .select('projects(id, name)')
                    .limit(50),
            ])

            const combined: { id: string, name: string }[] = []
            const addUnique = (p?: any) => {
                if (p && !combined.find((c) => c.id === p.id)) combined.push({ id: p.id, name: p.name })
            }

            const createdProjects = Array.isArray(createdBy) ? createdBy : []
            const teamProjects = (Array.isArray(teamAssignments) ? teamAssignments : [])
                .map((t: any) => t.projects)
                .filter(Boolean)

            createdProjects.forEach(addUnique)
            teamProjects.forEach(addUnique)

            setProjectOptions(combined)
        } catch (err) {
            console.error('loadProjects error', err)
        } finally {
            setProjectLoading(false)
        }
    }

    async function loadTasks() {
        setLoading(true)
        const [todayRes, overdueRes] = await Promise.all([
            getTodayTasks(),
            getOverdueTasks()
        ])

        console.log('[TaskManager] Today tasks response:', todayRes)
        console.log('[TaskManager] Overdue tasks response:', overdueRes)

        if (todayRes.data) {
            const tasksWithProposals = todayRes.data.filter((t: any) => t.proposed_project_name)
            console.log('[TaskManager] Tasks with proposals:', tasksWithProposals)
            console.log('[TaskManager] Setting tasks state with:', todayRes.data)
            setTasks(todayRes.data)
        }
        if (overdueRes.data) {
            console.log('[TaskManager] Setting overdue tasks state with:', overdueRes.data)
            setOverdueTasks(overdueRes.data)
        }
        setLoading(false)
    }

    async function handleCreateTask(e: React.FormEvent) {
        e.preventDefault()

        const payload: any = {
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            due_date: formData.due_date,
            project_id: formData.project_id || undefined,
            proposed_project_name: proposeNewProject ? formData.proposed_project_name : undefined,
            proposed_project_vertical: formData.proposed_project_vertical || undefined,
        }

        const result = await createTask(payload)
        if (result.error) {
            alert(result.error)
        } else {
            setIsDialogOpen(false)
            setFormData({ title: "", description: "", priority: "medium", due_date: "", project_id: "", proposed_project_name: "", proposed_project_vertical: "" })
            setProposeNewProject(false)
            await loadTasks()
        }
    }

    async function handleToggleComplete(task: any) {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed'
        const result = await updateTask(task.id, { status: newStatus })
        if (result.error) {
            alert(result.error)
        } else {
            await loadTasks()
        }
    }

    async function handleDeleteTask(taskId: string) {
        if (!confirm("Delete this task?")) return

        setDeletingTaskId(taskId)
        console.log('[handleDeleteTask] 🔵 START - Deleting task:', taskId)

        try {
            const result = await deleteTask(taskId)
            console.log('[handleDeleteTask] Result:', result)

            if (result.error) {
                console.error('[handleDeleteTask] ❌ Error:', result.error)
                alert('Failed to delete task: ' + result.error)
            } else {
                console.log('[handleDeleteTask] ✅ Task deleted, reloading...')
                await loadTasks()
                console.log('[handleDeleteTask] ✅ Tasks reloaded')
            }
        } catch (err) {
            console.error('[handleDeleteTask] ❌ Exception:', err)
            alert('Error deleting task: ' + String(err))
        } finally {
            setDeletingTaskId(null)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Loading tasks...</p>
                </CardContent>
            </Card>
        )
    }

    const allTasks = [...overdueTasks, ...tasks]

    return (
        <Card>
            <CardHeader className="relative">
                <div>
                    <CardTitle>My Tasks</CardTitle>
                    <CardDescription>Today's priorities and overdue items</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="absolute top-4 right-4">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>Add a new task to your list. You can propose a new project if needed.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <Label htmlFor="title">Task Title</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="priority">Priority</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Project</Label>
                                <Select
                                    value={proposeNewProject ? 'propose_new' : (formData.project_id || '')}
                                    onValueChange={(value) => {
                                        if (value === 'propose_new') {
                                            setProposeNewProject(true)
                                            setFormData({ ...formData, project_id: '', proposed_project_name: '' })
                                        } else {
                                            setProposeNewProject(false)
                                            setFormData({ ...formData, project_id: value, proposed_project_name: '' })
                                        }
                                    }}
                                    disabled={projectLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={projectLoading ? 'Loading projects...' : 'Select project'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectOptions.map((proj) => (
                                            <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                                        ))}
                                        <SelectItem value="propose_new">+ Propose new project</SelectItem>
                                    </SelectContent>
                                </Select>
                                {proposeNewProject && (
                                    <div className="mt-2 space-y-2">
                                        <div>
                                            <Label htmlFor="proposed_project_name">Proposed Project Name</Label>
                                            <Input
                                                id="proposed_project_name"
                                                value={formData.proposed_project_name}
                                                onChange={(e) => setFormData({ ...formData, proposed_project_name: e.target.value })}
                                                placeholder="e.g., New Client Campaign"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="proposed_project_vertical">Vertical</Label>
                                            <Select
                                                value={formData.proposed_project_vertical}
                                                onValueChange={(value: any) => setFormData({ ...formData, proposed_project_vertical: value })}
                                            >
                                                <SelectTrigger id="proposed_project_vertical">
                                                    <SelectValue placeholder="Select vertical" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="video_production">🎬 Video Production</SelectItem>
                                                    <SelectItem value="social_media">📱 Social Media</SelectItem>
                                                    <SelectItem value="design_branding">🎨 Design & Branding</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create Task</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {allTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No tasks for today. Create one to get started!
                    </p>
                ) : (
                    <div className="space-y-3">
                        {allTasks.map((task) => {
                            const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Circle
                            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

                            return (
                                <div
                                    key={task.id}
                                    className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors ${task.status === 'completed' ? 'opacity-60' : ''
                                        }`}
                                >
                                    <button
                                        onClick={() => handleToggleComplete(task)}
                                        className="mt-1"
                                    >
                                        <StatusIcon
                                            className={`h-5 w-5 ${task.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'
                                                }`}
                                        />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                                                        {task.priority}
                                                    </Badge>
                                                    {task.due_date && (
                                                        <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                                            {isOverdue ? 'Overdue: ' : 'Due: '}
                                                            {new Date(task.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {task.proposed_project_name && (
                                                        <Badge variant="outline" className="text-[11px]">
                                                            Pending project: {task.proposed_project_name} ({task.proposed_project_status || 'pending'})
                                                        </Badge>
                                                    )}
                                                    {/* Debug: Always show if task has proposal data */}
                                                    {(task.proposed_project_name || task.proposed_project_status) && console.log('[TaskManager] Task with proposal:', task.id, task.proposed_project_name, task.proposed_project_status)}
                                                    {task.projects?.name && (
                                                        <span className="text-xs text-muted-foreground">
                                                            • {task.projects.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteTask(task.id)}
                                                disabled={deletingTaskId === task.id}
                                            >
                                                {deletingTaskId === task.id ? (
                                                    <span className="text-xs">Deleting...</span>
                                                ) : (
                                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
