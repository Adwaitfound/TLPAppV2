'use client';

import React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Search, Loader2, Users, Mail, UserCheck, Shield, Briefcase, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User, Project } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { createTeamMember } from "@/app/actions/create-team-member"
import { debug } from "@/lib/debug"

type TeamMember = User & {
    projects?: Array<{
        project_id: string
        role?: string
        projects?: {
            name: string
            status: string
        }
    }>
}

export default function TeamPage() {
    const { user } = useAuth()
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState("")
    const [projectRole, setProjectRole] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [memberFormData, setMemberFormData] = useState({
        email: "",
        full_name: "",
        role: "project_manager" as "admin" | "project_manager" | "employee",
        password: "",
    })

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchData()
        }
    }, [user])

    async function fetchData() {
        const supabase = createClient()
        setLoading(true)

        try {
            debug.log('TEAM', 'Fetching team members...')
            // Fetch all team members (admins and project managers)
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .in('role', ['admin', 'project_manager', 'employee'])
                .order('full_name')

            if (usersError) {
                debug.error('TEAM', 'Fetch users error', { message: usersError.message, code: usersError.code })
                throw usersError
            }
            debug.success('TEAM', 'Team members fetched', { count: usersData?.length })

            if (usersError) throw usersError

            // Fetch project assignments for each team member
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('project_team')
                .select('user_id, project_id, role, projects(name, status)')

            if (assignmentsError) {
                console.warn('Project team table not available:', assignmentsError.message)
            }

            // Fetch all projects
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .order('name')

            if (projectsError) throw projectsError

            // Group assignments by user
            const assignmentsByUser = (assignmentsData || []).reduce((acc, assignment: any) => {
                if (!acc[assignment.user_id]) {
                    acc[assignment.user_id] = []
                }
                acc[assignment.user_id].push(assignment)
                return acc
            }, {} as Record<string, any[]>)

            // Combine users with their project assignments
            const membersWithProjects = (usersData || []).map(member => ({
                ...member,
                projects: assignmentsByUser[member.id] || []
            }))

            setTeamMembers(membersWithProjects)
            setProjects(projectsData || [])
        } catch (error: any) {
            console.error('Error fetching team data:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleAssignProject(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedMember || !selectedProjectId || submitting) return

        setSubmitting(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('project_team')
                .insert({
                    project_id: selectedProjectId,
                    user_id: selectedMember.id,
                    role: projectRole || null,
                    assigned_by: user?.id,
                })

            if (error) throw error

            // Close dialog and reset form BEFORE refreshing
            setIsAssignDialogOpen(false)
            setSelectedProjectId("")
            setProjectRole("")

            // Then refresh data
            await fetchData()
        } catch (error: any) {
            console.error('Error assigning project:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
            })
            alert(error?.message || 'Failed to assign project. The project_team table may not exist yet. Please run migration 008.')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleRemoveAssignment(memberId: string, projectId: string) {
        if (!confirm('Remove this team member from the project?')) return

        const supabase = createClient()

        try {
            const { error } = await supabase
                .from('project_team')
                .delete()
                .eq('user_id', memberId)
                .eq('project_id', projectId)

            if (error) throw error

            // Refresh data
            await fetchData()
        } catch (error: any) {
            console.error('Error removing assignment:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
            })
            alert(error?.message || 'Failed to remove assignment')
        }
    }

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return

        setSubmitting(true)

        try {
            // Use server action to create team member with admin privileges
            const result = await createTeamMember({
                email: memberFormData.email,
                full_name: memberFormData.full_name,
                role: memberFormData.role,
                password: memberFormData.password,
            })

            if (result.error) {
                throw new Error(result.error)
            }

            // Close dialog and reset form BEFORE refreshing
            setIsAddMemberDialogOpen(false)
            setMemberFormData({
                email: "",
                full_name: "",
                role: "project_manager",
                password: "",
            })

            // Then refresh data
            await fetchData()

            // Show success message
            alert(
                `✅ Team member added successfully!\n\n` +
                `Email: ${memberFormData.email}\n` +
                `Name: ${memberFormData.full_name}\n` +
                `Role: ${memberFormData.role === 'admin' ? 'Admin' : 'Project Manager'}\n\n` +
                `The team member can now log in immediately at:\n` +
                `${window.location.origin}/login\n\n` +
                `Login credentials:\n` +
                `• Email: ${memberFormData.email}\n` +
                `• Password: (the password you just set)\n\n` +
                `💡 Tip: Share these credentials securely and recommend they change their password in Settings after first login.`
            )
        } catch (error: any) {
            console.error('Error adding team member:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
            })

            let errorMessage = 'Failed to add team member.'

            if (error?.message?.includes('already registered') || error?.message?.includes('already exists')) {
                errorMessage = 'This email is already registered. Please use a different email.'
            } else if (error?.message) {
                errorMessage = error.message
            }

            alert(errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredMembers = teamMembers.filter((member) => {
        const matchesSearch =
            member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === "all" || member.role === roleFilter
        return matchesSearch && matchesRole
    })

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin':
                return <Shield className="h-4 w-4" />
            case 'project_manager':
                return <Briefcase className="h-4 w-4" />
            default:
                return <UserCheck className="h-4 w-4" />
        }
    }

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            case 'project_manager':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }
    }

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
                <p className="text-sm text-muted-foreground">Only administrators can manage team members</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team Members</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        Manage team members and project assignments
                    </p>
                </div>
                <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Team Member
                </Button>
            </div>

            {/* Team Stats */}
            {!loading && teamMembers.length > 0 && (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs">Total Members</CardDescription>
                            <CardTitle className="text-2xl">{teamMembers.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Active team members
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs">Admins</CardDescription>
                            <CardTitle className="text-2xl">
                                {teamMembers.filter(m => m.role === 'admin').length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                System administrators
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs">Project Managers</CardDescription>
                            <CardTitle className="text-2xl">
                                {teamMembers.filter(m => m.role === 'project_manager').length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Project leads
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search team members..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="project_manager">Project Managers</SelectItem>
                        <SelectItem value="employee">Employees</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : teamMembers.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                        <p className="text-sm text-muted-foreground">Team members will appear here</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredMembers.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <p className="text-sm text-muted-foreground">No team members match your search</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredMembers.map((member) => (
                            <Card key={member.id} className="hover:bg-accent/50 transition-colors">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg font-medium">
                                                    {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">{member.full_name || 'Unnamed User'}</CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-1">
                                                    <Mail className="h-3 w-3" />
                                                    {member.email}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={getRoleBadgeClass(member.role)}>
                                            <span className="mr-1">{getRoleIcon(member.role)}</span>
                                            {member.role.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Project Assignments */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold">Project Assignments</h4>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedMember(member)
                                                    setIsAssignDialogOpen(true)
                                                }}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Assign Project
                                            </Button>
                                        </div>
                                        {member.projects && member.projects.length > 0 ? (
                                            <div className="space-y-2">
                                                {member.projects.map((assignment: any) => (
                                                    <div
                                                        key={assignment.project_id}
                                                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {assignment.projects?.name || 'Unknown Project'}
                                                            </p>
                                                            {assignment.role && (
                                                                <p className="text-xs text-muted-foreground">{assignment.role}</p>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveAssignment(member.id, assignment.project_id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No project assignments yet</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Assign Project Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleAssignProject}>
                        <DialogHeader>
                            <DialogTitle>Assign Project</DialogTitle>
                            <DialogDescription>
                                Assign {selectedMember?.full_name || selectedMember?.email} to a project
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="project">Project *</Label>
                                <Select
                                    value={selectedProjectId}
                                    onValueChange={setSelectedProjectId}
                                    required
                                >
                                    <SelectTrigger id="project">
                                        <SelectValue placeholder="Select a project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.length === 0 ? (
                                            <SelectItem value="none" disabled>No projects available</SelectItem>
                                        ) : (
                                            projects
                                                .filter(p => !selectedMember?.projects?.find((a: any) => a.project_id === p.id))
                                                .map((project) => (
                                                    <SelectItem key={project.id} value={project.id}>
                                                        {project.name}
                                                    </SelectItem>
                                                ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="project-role">Role (Optional)</Label>
                                <Input
                                    id="project-role"
                                    placeholder="e.g., Lead Editor, Designer"
                                    value={projectRole}
                                    onChange={(e) => setProjectRole(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAssignDialogOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting || !selectedProjectId}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Assign Project
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Team Member Dialog */}
            <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleAddMember}>
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>
                                Create a new team member account. They can log in immediately after creation.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="member-email">Email *</Label>
                                <Input
                                    id="member-email"
                                    type="email"
                                    placeholder="john@example.com"
                                    required
                                    value={memberFormData.email}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="member-name">Full Name *</Label>
                                <Input
                                    id="member-name"
                                    placeholder="John Doe"
                                    required
                                    value={memberFormData.full_name}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="member-role">Role *</Label>
                                <Select
                                    value={memberFormData.role}
                                    onValueChange={(value: "admin" | "project_manager" | "employee") => setMemberFormData({ ...memberFormData, role: value })}
                                    required
                                >
                                    <SelectTrigger id="member-role">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="project_manager">Project Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="employee">Employee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="member-password">Temporary Password *</Label>
                                <Input
                                    id="member-password"
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    required
                                    minLength={6}
                                    value={memberFormData.password}
                                    onChange={(e) => setMemberFormData({ ...memberFormData, password: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Set a temporary password. User should change it after first login.
                                </p>
                            </div>
                            <div className="rounded-lg bg-muted p-3">
                                <p className="text-xs text-muted-foreground">
                                    <strong>✨ Instant Access:</strong><br />
                                    • Account is created and ready immediately<br />
                                    • No email confirmation required<br />
                                    • User can log in right away<br />
                                    • Share the login URL and credentials securely
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddMemberDialogOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Team Member
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
