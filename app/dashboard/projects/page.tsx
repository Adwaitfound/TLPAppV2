'use client';
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, jsx-a11y/alt-text, @next/next/no-img-element */

import React from "react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { debug } from "@/lib/debug"
// (duplicate Select import removed)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { Plus, Search, Calendar, DollarSign, Loader2, FolderKanban, Video, Eye, Edit, Trash2, Users, FileText, CheckSquare, TrendingUp, Clock, Image, File as FileIcon, UserCheck, ListTodo } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Project, Client, ProjectStatus, ServiceType, ProjectFile, Milestone, User, SubProject, SubProjectComment, SubProjectUpdate, MilestoneStatus } from "@/types"
import { SERVICE_TYPES, SERVICE_TYPE_OPTIONS } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { FileManager } from "@/components/projects/file-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createMilestone, updateMilestoneStatus, deleteMilestone } from "@/app/actions/milestones"

function ProjectsPageContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projectFiles, setProjectFiles] = useState<Record<string, ProjectFile[]>>({})
  const [projectMilestones, setProjectMilestones] = useState<Record<string, Milestone[]>>({})
  const [projectCreators, setProjectCreators] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [projectTeam, setProjectTeam] = useState<Record<string, User[]>>({})
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [teamRole, setTeamRole] = useState("")
  const [milestoneFormData, setMilestoneFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  })
  const milestoneStatusOptions: { value: MilestoneStatus; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "blocked", label: "Blocked" },
  ]
  const [editFormData, setEditFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    service_type: "video_production" as ServiceType,
    budget: "",
    start_date: "",
    deadline: "",
    status: "planning" as ProjectStatus,
    progress_percentage: 0,
  })

  // Sub-projects state
  const [subProjects, setSubProjects] = useState<Record<string, SubProject[]>>({})
  const [selectedSubProject, setSelectedSubProject] = useState<SubProject | null>(null)
  const [isSubProjectDialogOpen, setIsSubProjectDialogOpen] = useState(false)
  const [isEditSubProjectDialogOpen, setIsEditSubProjectDialogOpen] = useState(false)
  const [subProjectFormData, setSubProjectFormData] = useState({
    name: "",
    description: "",
    assigned_to: "unassigned",
    due_date: "",
    status: "planning" as ProjectStatus,
    video_url: "",
  })
  const [editSubProjectFormData, setEditSubProjectFormData] = useState({
    name: "",
    description: "",
    assigned_to: "unassigned",
    due_date: "",
    status: "planning" as ProjectStatus,
    video_url: "",
  })
  const [subProjectComments, setSubProjectComments] = useState<Record<string, SubProjectComment[]>>({})
  const [subProjectUpdates, setSubProjectUpdates] = useState<Record<string, SubProjectUpdate[]>>({})
  const [newComment, setNewComment] = useState("")
  const [newUpdate, setNewUpdate] = useState("")
  const [isSubProjectDetailOpen, setIsSubProjectDetailOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    service_type: "video_production" as ServiceType,
    budget: "",
    start_date: "",
    deadline: "",
    status: "planning" as ProjectStatus,
  })

  // Handle URL parameters for service filter
  useEffect(() => {
    const serviceParam = searchParams.get('service')
    if (serviceParam && ['video_production', 'social_media', 'design_branding'].includes(serviceParam)) {
      setServiceFilter(serviceParam)
    }
  }, [searchParams])

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch team members when team dialog opens with a selected project
  useEffect(() => {
    if (isTeamDialogOpen && selectedProject) {
      console.log('Team dialog opened, fetching members for project:', selectedProject.id)
      fetchProjectTeamMembers(selectedProject.id)
    }
  }, [isTeamDialogOpen, selectedProject?.id])

  async function fetchData() {
    debug.log('FETCH_DATA', 'Starting data fetch...')
    const supabase = createClient()
    setLoading(true)

    try {
      let projectsData: Project[] = []

      console.log('[ProjectsPage] 🔵 FETCH START - User:', user?.id, 'Email:', user?.email, 'Role:', user?.role)

      // Filter projects based on user role
      if (user?.role === 'project_manager' || user?.role === 'employee') {
        console.log('[ProjectsPage] 🔷 Employee/PM fetch mode')

        // For employees: fetch projects they created OR are team members of
        console.log('[ProjectsPage] Fetching projects created by:', user.id)
        const { data: createdProjects, error: createdError } = await supabase
          .from('projects')
          .select('*, clients(company_name, contact_person)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        console.log('[ProjectsPage] Created projects result:', { count: createdProjects?.length, error: createdError })
        if (createdError) throw createdError

        // Fetch projects where user is a team member
        console.log('[ProjectsPage] Fetching project_team entries for user:', user.id)
        const { data: teamProjects, error: teamError } = await supabase
          .from('project_team')
          .select('projects(*, clients(company_name, contact_person))')
          .eq('user_id', user.id)

        console.log('[ProjectsPage] Team projects result:', { count: teamProjects?.length, error: teamError })
        if (teamError) {
          console.warn('[ProjectsPage] ⚠️ Team projects query failed:', teamError)
        }

        // Combine and deduplicate projects
        const allProjects = [...(createdProjects || [])]
        const teamProjectsData = (teamProjects || []).map((tp: any) => tp.projects).filter(Boolean)

        console.log('[ProjectsPage] Before dedup - created:', allProjects.length, 'from team:', teamProjectsData.length)

        teamProjectsData.forEach((tp: any) => {
          if (!allProjects.find(p => p.id === tp.id)) {
            allProjects.push(tp)
          }
        })

        console.log('[ProjectsPage] After dedup - total projects:', allProjects.length)
        allProjects.forEach(p => console.log('[ProjectsPage] Project:', p.id, p.name))

        projectsData = allProjects
      } else {
        // For admin: fetch all projects
        console.log('[ProjectsPage] 🔷 Admin fetch mode - fetching ALL projects')
        const { data: allProjects, error: projectsError } = await supabase
          .from('projects')
          .select('*, clients(company_name, contact_person)')
          .order('created_at', { ascending: false })

        console.log('[ProjectsPage] All projects result:', { count: allProjects?.length, error: projectsError })
        if (projectsError) throw projectsError
        projectsData = allProjects || []
      }

      console.log('[ProjectsPage] ✅ Total projects to display:', projectsData.length)
      debug.success('FETCH_DATA', 'Projects fetched', { count: projectsData?.length })

      // Fetch clients for dropdown
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company_name')

      if (clientsError) throw clientsError
      debug.success('FETCH_DATA', 'Clients fetched', { count: clientsData?.length })

      setProjects(projectsData || [])
      setClients(clientsData || [])

      // Fetch recent files for the listed projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id)
        const { data: filesData, error: filesError } = await supabase
          .from('project_files')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })

        if (filesError) throw filesError

        const grouped = (filesData || []).reduce((acc, file) => {
          acc[file.project_id] = acc[file.project_id] || []
          acc[file.project_id].push(file as ProjectFile)
          return acc
        }, {} as Record<string, ProjectFile[]>)

        setProjectFiles(grouped)
      }

      // Fetch milestones for projects
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map((p) => p.id)
        const { data: milestonesData, error: milestonesError } = await supabase
          .from('milestones')
          .select('*')
          .in('project_id', projectIds)
          .order('position', { ascending: true })
          .order('due_date', { ascending: true })

        if (milestonesError) {
          console.warn('Milestones table not available:', milestonesError.message)
        } else {
          const groupedMilestones = (milestonesData || []).reduce((acc, milestone) => {
            acc[milestone.project_id] = acc[milestone.project_id] || []
            acc[milestone.project_id].push(milestone as Milestone)
            return acc
          }, {} as Record<string, Milestone[]>)

          setProjectMilestones(groupedMilestones)
        }
      }

      // Fetch creator info for projects
      if (projectsData && projectsData.length > 0) {
        const creatorIds = [...new Set(projectsData.map((p) => p.created_by).filter(Boolean))] as string[]
        if (creatorIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .in('id', creatorIds)

          if (usersError) throw usersError

          const creatorsMap = (usersData || []).reduce((acc, user) => {
            acc[user.id] = user as User
            return acc
          }, {} as Record<string, User>)

          setProjectCreators(creatorsMap)
        }
      }

      // Fetch project team members
      if (projectsData && projectsData.length > 0) {
        debug.log('FETCH_DATA', 'Fetching team members for projects...', { projectIds: projectsData.map(p => p.id) })
        const projectIds = projectsData.map((p) => p.id)
        const { data: teamData, error: teamError } = await supabase
          .from('project_team')
          .select('project_id, user_id, user:users!user_id(id, email, full_name, avatar_url, role)')
          .in('project_id', projectIds)

        if (teamError) {
          debug.warn('FETCH_DATA', 'Team fetch error:', teamError)
          console.warn('Project team table not available:', teamError.message)
        } else {
          debug.log('FETCH_DATA', 'Team data received', { rawCount: teamData?.length })
          const teamMap = (teamData || []).reduce((acc, assignment: any) => {
            if (!acc[assignment.project_id]) {
              acc[assignment.project_id] = []
            }
            if (assignment.user) {
              acc[assignment.project_id].push(assignment.user as User)
            }
            return acc
          }, {} as Record<string, User[]>)

          debug.success('FETCH_DATA', 'Team members mapped', { projectsWithTeam: Object.keys(teamMap).length, teamMap })
          setProjectTeam(teamMap)
        }
      }

      // Fetch all users for team assignment (only admins/PMs)
      if (user?.role === 'admin' || user?.role === 'project_manager') {
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('full_name', { ascending: true, nullsFirst: false })

        if (usersError) {
          console.error('Error fetching users:', usersError)
        } else {
          // Show all internal roles when assigning projects (admins, PMs, employees)
          const filteredUsers = (allUsers || []).filter(u =>
            u.role === 'admin' || u.role === 'project_manager' || u.role === 'employee'
          )
          setAvailableUsers(filteredUsers)
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: formData.name,
          client_id: formData.client_id,
          description: formData.description,
          service_type: formData.service_type,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          start_date: formData.start_date || null,
          deadline: formData.deadline || null,
          status: formData.status,
          progress_percentage: 0,
          created_by: user?.id,
        }])
        .select()

      if (error) throw error

      // Reset form and close dialog first
      setFormData({
        name: "",
        client_id: "",
        description: "",
        service_type: "video_production" as ServiceType,
        budget: "",
        start_date: "",
        deadline: "",
        status: "planning",
      })
      setIsDialogOpen(false)

      // Then refresh projects list
      await fetchData()
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert(error.message || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || submitting) return

    setSubmitting(true)
    try {
      const { data, error } = await createMilestone({
        project_id: selectedProject.id,
        title: milestoneFormData.title,
        description: milestoneFormData.description,
        due_date: milestoneFormData.due_date || null,
        status: 'pending',
      })

      if (error) throw new Error(error)

      // Reset form and close first
      setMilestoneFormData({ title: "", description: "", due_date: "" })
      setIsMilestoneDialogOpen(false)

      if (data) {
        setProjectMilestones(prev => ({
          ...prev,
          [selectedProject.id]: [data as Milestone, ...(prev[selectedProject.id] || [])],
        }))
      }
    } catch (error: any) {
      console.error('Error adding milestone:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      alert(error?.message || 'Failed to add milestone. The milestones table may not exist yet.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMilestoneStatusChange(projectId: string, milestoneId: string, status: MilestoneStatus) {
    const { error, data } = await updateMilestoneStatus(milestoneId, status)
    if (error) {
      alert(error)
      return
    }
    if (data) {
      setProjectMilestones(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).map(m => (m.id === milestoneId ? { ...m, status: data.status } : m)),
      }))
    }
  }

  async function handleDeleteMilestone(projectId: string, milestoneId: string) {
    if (!confirm('Delete this milestone?')) return
    const { error } = await deleteMilestone(milestoneId)
    if (error) {
      alert(error)
      return
    }
    setProjectMilestones(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(m => m.id !== milestoneId),
    }))
  }

  async function handleAssignTeamMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || !selectedUserId || submitting) return

    debug.log('ASSIGN_TEAM', 'Start team assignment', { projectId: selectedProject.id, userId: selectedUserId })
    console.log('=== ASSIGN TEAM MEMBER START ===')
    console.log('Selected Project ID:', selectedProject.id)
    console.log('Selected User ID:', selectedUserId)
    console.log('Current projectTeam state:', projectTeam)

    // Check if user is already assigned
    const alreadyAssigned = projectTeam[selectedProject.id]?.find(m => m.id === selectedUserId)
    if (alreadyAssigned) {
      debug.warn('ASSIGN_TEAM', 'User already assigned', { userId: selectedUserId })
      alert('This team member is already assigned to this project')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('project_team')
        .insert({
          project_id: selectedProject.id,
          user_id: selectedUserId,
          role: teamRole || null,
          assigned_by: user?.id,
        })

      if (error) {
        // Handle duplicate key error specifically
        if (error.code === '23505') {
          throw new Error('This team member is already assigned to this project')
        }
        throw error
      }

      debug.success('ASSIGN_TEAM', 'Team member inserted', { projectId: selectedProject.id, userId: selectedUserId })
      console.log('Team member inserted successfully')

      // Reset form first
      setSelectedUserId("")
      setTeamRole("")

      // Refresh team members for this project and wait for it
      debug.log('ASSIGN_TEAM', 'Fetching updated team members...')
      console.log('Fetching updated team members...')
      const updatedMembers = await fetchProjectTeamMembers(selectedProject.id)
      debug.success('ASSIGN_TEAM', 'Members updated', { members: updatedMembers.map(m => m.email) })
      console.log('Updated members returned:', updatedMembers)
      console.log('=== ASSIGN TEAM MEMBER END ===')

      // Don't close dialog - let user see the updated list
      // setIsTeamDialogOpen(false)
    } catch (error: any) {
      debug.error('ASSIGN_TEAM', 'Assignment failed', error)
      console.error('Error assigning team member:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      alert(error?.message || 'Failed to assign team member')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveTeamMember(userId: string) {
    if (!selectedProject) return
    if (!confirm('Remove this team member from the project?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('project_team')
        .delete()
        .eq('project_id', selectedProject.id)
        .eq('user_id', userId)

      if (error) throw error

      // Update local state immediately
      setProjectTeam(prev => ({
        ...prev,
        [selectedProject.id]: prev[selectedProject.id]?.filter(m => m.id !== userId) || []
      }))
    } catch (error: any) {
      console.error('Error removing team member:', error)
      alert('Failed to remove team member')
    }
  }

  async function fetchProjectTeamMembers(projectId: string) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('project_team')
        .select('*, user:users!user_id(id, email, full_name, avatar_url, role)')
        .eq('project_id', projectId)

      if (error) {
        debug.error('FETCH_TEAM', 'Query error:', error)
        console.error('Error fetching team members:', error)
        throw error
      }

      debug.log('FETCH_TEAM', 'Raw data from query:', { projectId, count: data?.length })
      console.log('Fetched team data:', data)
      const members = (data || []).map((assignment: any) => assignment.user as User).filter(Boolean)
      debug.success('FETCH_TEAM', 'Members processed', { projectId, members: members.map(m => ({ id: m.id, email: m.email })) })
      console.log('Processed team members:', members)
      setProjectTeam(prev => ({ ...prev, [projectId]: members }))
      return members
    } catch (error) {
      debug.error('FETCH_TEAM', 'Exception:', error)
      console.error('Error in fetchProjectTeamMembers:', error)
      return []
    }
  }

  async function fetchSubProjects(projectId: string) {
    const supabase = createClient()

    try {
      const { data: subProjectsData, error } = await supabase
        .from('sub_projects')
        .select('*, assigned_user:users!assigned_to(id, email, full_name, avatar_url, role)')
        .eq('parent_project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Sub-projects table not available:', error.message)
        return
      }

      setSubProjects(prev => ({ ...prev, [projectId]: subProjectsData || [] }))
    } catch (error: any) {
      console.error('Error fetching sub-projects:', error)
    }
  }

  async function handleAddSubProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || submitting) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      // Validate form data
      if (!subProjectFormData.name.trim()) {
        throw new Error('Task name is required')
      }

      const assignedUserId = subProjectFormData.assigned_to === "unassigned" ? null : subProjectFormData.assigned_to

      const { error } = await supabase
        .from('sub_projects')
        .insert({
          parent_project_id: selectedProject.id,
          name: subProjectFormData.name,
          description: subProjectFormData.description,
          assigned_to: assignedUserId,
          due_date: subProjectFormData.due_date || null,
          status: subProjectFormData.status,
          video_url: subProjectFormData.video_url || null,
          created_by: user?.id,
        })

      if (error) throw error

      // If assigned to an employee, also create an employee_tasks entry
      if (assignedUserId) {
        const { error: taskError } = await supabase
          .from('employee_tasks')
          .insert({
            user_id: assignedUserId,
            project_id: selectedProject.id,
            title: subProjectFormData.name,
            description: subProjectFormData.description,
            due_date: subProjectFormData.due_date || null,
            status: 'todo'
          })

        if (taskError) {
          console.warn('Warning: Task created in sub_projects but failed to create employee task:', taskError)
          // Don't fail the whole operation if employee_tasks insert fails
        }
      }

      // Reset form first BEFORE closing dialog to ensure state is clean
      setSubProjectFormData({ name: "", description: "", assigned_to: "unassigned", due_date: "", status: "planning", video_url: "" })

      // Close dialog
      setIsSubProjectDialogOpen(false)

      // Then fetch updated data
      await fetchSubProjects(selectedProject.id)
    } catch (error: any) {
      console.error('Error adding sub-project:', error)
      const errorMsg = error?.message || error?.error_description || 'Failed to add task'
      alert(errorMsg.includes('sub_projects') || errorMsg.includes('migration') ?
        'Task feature not available. Please run migration 009 or contact support.' : errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSubProject || submitting) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      const assignedUserId = editSubProjectFormData.assigned_to === "unassigned" ? null : editSubProjectFormData.assigned_to

      const { error } = await supabase
        .from('sub_projects')
        .update({
          name: editSubProjectFormData.name,
          description: editSubProjectFormData.description,
          assigned_to: assignedUserId,
          due_date: editSubProjectFormData.due_date || null,
          status: editSubProjectFormData.status,
          video_url: editSubProjectFormData.video_url || null,
        })
        .eq('id', selectedSubProject.id)

      if (error) throw error

      // Update employee_tasks if assignment changed
      if (assignedUserId) {
        // Check if there's already an employee task for this sub-project
        const { data: existingTask } = await supabase
          .from('employee_tasks')
          .select('id')
          .eq('user_id', assignedUserId)
          .eq('project_id', selectedProject?.id)
          .match({ title: editSubProjectFormData.name })
          .single()

        if (!existingTask) {
          // Create new employee task
          await supabase
            .from('employee_tasks')
            .insert({
              user_id: assignedUserId,
              project_id: selectedProject?.id,
              title: editSubProjectFormData.name,
              description: editSubProjectFormData.description,
              due_date: editSubProjectFormData.due_date || null,
              status: 'todo'
            })
        }
      }

      setIsEditSubProjectDialogOpen(false)
      setSelectedSubProject(null)

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id)
      }
    } catch (error: any) {
      console.error('Error updating sub-project:', error)
      alert('Failed to update task')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateSubProjectProgress(subProjectId: string, progress: number) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('sub_projects')
        .update({ progress_percentage: progress })
        .eq('id', subProjectId)

      if (error) throw error

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id)
      }
    } catch (error: any) {
      console.error('Error updating sub-project progress:', error)
    }
  }

  async function handleUpdateSubProjectStatus(subProjectId: string, status: ProjectStatus) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('sub_projects')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', subProjectId)

      if (error) throw error

      if (selectedProject) {
        await fetchSubProjects(selectedProject.id)
      }
    } catch (error: any) {
      console.error('Error updating sub-project status:', error)
    }
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clients?.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    const matchesService = serviceFilter === "all" || project.service_type === serviceFilter
    return matchesSearch && matchesStatus && matchesService
  })

  // Calculate project stats
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    planning: projects.filter(p => p.status === 'planning').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    avgProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress_percentage, 0) / projects.length) : 0,
  }

  function openProjectDetails(project: Project) {
    setSelectedProject(project)
    setIsDetailModalOpen(true)
    fetchSubProjects(project.id)
  }

  function openEditDialog(project: Project) {
    setSelectedProject(project)
    setEditFormData({
      name: project.name,
      client_id: project.client_id,
      description: project.description || "",
      service_type: project.service_type,
      budget: project.budget?.toString() || "",
      start_date: project.start_date || "",
      deadline: project.deadline || "",
      status: project.status,
      progress_percentage: project.progress_percentage,
    })
    setIsEditDialogOpen(true)
  }

  async function openTeamDialog(project: Project) {
    setSelectedProject(project)
    setIsTeamDialogOpen(true)
    // Fetch team members immediately when dialog opens
    await fetchProjectTeamMembers(project.id)
  }

  function openInvoices(project: Project) {
    window.location.href = `/dashboard/invoices?project=${project.id}`
  }

  async function handleEditProject(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || submitting) return

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: editFormData.name,
          client_id: editFormData.client_id || null,
          description: editFormData.description || null,
          service_type: editFormData.service_type,
          budget: editFormData.budget ? Number(editFormData.budget) : null,
          start_date: editFormData.start_date || null,
          deadline: editFormData.deadline || null,
          status: editFormData.status,
          progress_percentage: editFormData.progress_percentage,
        })
        .eq('id', selectedProject.id)
        .select()
        .single()

      if (error) throw error

      if (data) {
        setProjects(prev => prev.map(p => (p.id === selectedProject.id ? { ...p, ...data } : p)))
      }

      setIsEditDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      console.error('Error updating project:', error)
      alert(error.message || 'Failed to update project')
    } finally {
      setSubmitting(false)
    }
  }

  const getServiceIcon = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.icon || '📁'
  }

  const getServiceLabel = (serviceType: ServiceType) => {
    return SERVICE_TYPES[serviceType]?.label || serviceType
  }

  // Calendar state & helpers
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false)
  const [isDateDetailsOpen, setIsDateDetailsOpen] = useState(false)
  const [dateDetails, setDateDetails] = useState<{ date: Date; events: CalendarEvent[] } | null>(null)
  type CalendarEvent = {
    id: string
    date: string // ISO date
    title: string
    copy?: string
    status?: 'idea' | 'editing' | 'scheduled' | 'published' | 'review'
    platform?: 'instagram' | 'facebook' | 'youtube' | 'linkedin'
    type?: 'reel' | 'carousel' | 'story' | 'static' | 'video'
    attachments?: { id: string; url: string; kind: 'image' | 'video' | 'pdf' | 'document' }[]
  }
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  // TODO: Load from Supabase for selected project when opening dialog

  async function handleCreateCalendarEvent(date: Date) {
    const title = prompt('Title for content?') || 'New Content'
    const event_date = date.toISOString().slice(0, 10)
    if (!selectedProject) return
    try {
      // Persist
      const created = await (await import("@/app/actions/calendar-events")).createCalendarEvent({
        project_id: selectedProject.id,
        event_date,
        title,
        status: 'idea',
      })
      // Mirror locally
      setCalendarEvents(prev => [...prev, {
        id: created.id,
        date: created.event_date,
        title: created.title,
        copy: created.copy,
        status: created.status,
      }])
    } catch (e) {
      console.error(e)
      alert('Failed to create calendar event')
    }
  }

  async function handleUpdateCalendarEvent(event: CalendarEvent) {
    try {
      await (await import("@/app/actions/calendar-events")).updateCalendarEvent(event.id, {
        title: event.title,
        copy: event.copy,
        status: event.status,
        attachments: event.attachments?.map(a => ({ url: a.url, kind: a.kind }))
      })
      setCalendarEvents(prev => prev.map(e => e.id === event.id ? event : e))
    } catch (e) {
      console.error(e)
      alert('Failed to update event')
    }
  }

  async function handleDeleteCalendarEvent(eventId: string) {
    try {
      await (await import("@/app/actions/calendar-events")).deleteCalendarEvent(eventId)
      setCalendarEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (e) {
      console.error(e)
      alert('Failed to delete event')
    }
  }

  // Simple Notion-like monthly calendar view
  function CalendarView({
    events,
    onCreate,
    onUpdate,
    onDelete,
    onOpenDate,
  }: {
    events: CalendarEvent[]
    onCreate: (date: Date) => void
    onUpdate: (event: CalendarEvent) => void
    onDelete: (eventId: string) => void
    onOpenDate: (date: Date, events: CalendarEvent[]) => void
  }) {
    const [current, setCurrent] = useState(new Date())
    const startOfMonth = new Date(current.getFullYear(), current.getMonth(), 1)
    const endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0)
    const startDay = startOfMonth.getDay() // 0-6
    const daysInMonth = endOfMonth.getDate()

    const weeks: Array<Array<Date | null>> = []
    let week: Array<Date | null> = new Array(startDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(current.getFullYear(), current.getMonth(), d)
      week.push(date)
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
    }
    if (week.length) {
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }

    const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

    function eventsForDate(date: Date) {
      const iso = date.toISOString().slice(0, 10)
      return events.filter(e => (e.date || '').slice(0, 10) === iso)
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">{formatter.format(current)}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}>Next</Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="px-2 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeks.map((w, wi) => (
            <div key={wi} className="contents">
              {w.map((date, di) => (
                <div key={di} className="rounded-lg border p-2 min-h-[110px] bg-white/5 hover:bg-white/10 transition-colors">
                  {date ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{date.getDate()}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onCreate(date)}>+ Add</Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onOpenDate(date, eventsForDate(date))}>Open</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {eventsForDate(date).map(ev => (
                          <div key={ev.id} className="rounded-md border p-2 bg-white/10">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium truncate">{ev.title}</span>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onDelete(ev.id)}>Del</Button>
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onUpdate({ ...ev, status: ev.status === 'published' ? 'scheduled' : 'published' })}>
                                  {ev.status === 'published' ? 'Unpublish' : 'Publish'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => {
                                    const url = prompt('Paste image/video URL')
                                    if (!url) return
                                    const kind: 'image' | 'video' | 'pdf' | 'document' = url.match(/\.(png|jpg|jpeg|gif|webp)$/i)
                                      ? 'image'
                                      : url.match(/\.(mp4|webm|mov)$/i)
                                        ? 'video'
                                        : url.match(/\.(pdf)$/i)
                                          ? 'pdf'
                                          : 'document'
                                    const att = { id: Math.random().toString(36).slice(2), url, kind }
                                    const next: CalendarEvent = { ...ev, attachments: [...(ev.attachments || []), att] }
                                    onUpdate(next)
                                  }}
                                >
                                  Add Media
                                </Button>
                              </div>
                            </div>
                            {ev.copy && (
                              <div className="mt-1 text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                                {ev.copy}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ev.platform && (<Badge variant="outline" className="text-[10px]">{ev.platform}</Badge>)}
                              {ev.type && (<Badge variant="outline" className="text-[10px]">{ev.type}</Badge>)}
                              {ev.status && (<Badge variant="outline" className="text-[10px]">{ev.status}</Badge>)}
                            </div>
                            {ev.attachments && ev.attachments.length > 0 && (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                {ev.attachments.map(att => (
                                  <div key={att.id} className="rounded-md overflow-hidden border bg-black/20">
                                    {att.kind === 'image' && (
                                      <img src={att.url} alt="attachment" className="w-full h-20 object-cover" />
                                    )}
                                    {att.kind === 'video' && (
                                      <video src={att.url} className="w-full h-20 object-cover" controls preload="metadata" />
                                    )}
                                    {att.kind !== 'image' && att.kind !== 'video' && (
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs p-2 inline-block w-full truncate">
                                        {att.url}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getServiceBadgeVariant = (serviceType: ServiceType): "default" | "secondary" | "destructive" | "outline" => {
    switch (serviceType) {
      case 'video_production':
        return 'default'
      case 'social_media':
        return 'secondary'
      case 'design_branding':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  // Quick Add Form component
  function DateQuickAddForm({
    onAdd,
  }: {
    onAdd: (payload: { title: string; copy?: string; platform?: CalendarEvent['platform']; type?: CalendarEvent['type']; status?: CalendarEvent['status']; attachments?: CalendarEvent['attachments'] }) => void
  }) {
    const [title, setTitle] = useState('')
    const [copy, setCopy] = useState('')
    const [platform, setPlatform] = useState<CalendarEvent['platform']>('instagram')
    const [type, setType] = useState<CalendarEvent['type']>('reel')
    const [status, setStatus] = useState<CalendarEvent['status']>('idea')
    const [attachmentUrl, setAttachmentUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadedAttachments, setUploadedAttachments] = useState<CalendarEvent['attachments']>([])

    function addAttachmentFromUrl(url: string): CalendarEvent['attachments'] | undefined {
      if (!url) return undefined
      const kind: 'image' | 'video' | 'pdf' | 'document' = url.match(/\.(png|jpg|jpeg|gif|webp)$/i)
        ? 'image'
        : url.match(/\.(mp4|webm|mov)$/i)
          ? 'video'
          : url.match(/\.(pdf)$/i)
            ? 'pdf'
            : 'document'
      return [{ id: Math.random().toString(36).slice(2), url, kind }]
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const { validateFileSize, getFileType } = await import('@/lib/file-upload')
        const result = validateFileSize(file)
        if (!result.valid) {
          alert(result.error)
          return
        }
        const fileType = getFileType(file.name) as 'image' | 'video' | 'pdf' | 'document' | 'other'
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const path = `content/${Date.now()}_${file.name}`
        const { error } = await sb.storage.from('project-files').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (error) throw new Error(error.message)
        const { data: pub } = sb.storage.from('project-files').getPublicUrl(path)
        const att = { id: Math.random().toString(36).slice(2), url: pub.publicUrl, kind: fileType === 'other' ? 'document' : fileType }
        setUploadedAttachments(prev => [...(prev || []), att])
      } catch (err: any) {
        console.error('Upload failed', err)
        alert(err.message || 'Upload failed')
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    }

    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs text-muted-foreground">Copy / Caption</label>
              <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Write caption, brief, or notes" rows={4} />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as CalendarEvent['platform'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as CalendarEvent['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CalendarEvent['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="editing">Editing</SelectItem>
                  <SelectItem value="review">Ready for review</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Attachment URL (optional)</label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://..." />
            <div className="flex items-center gap-2">
              <input type="file" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx,.txt" />
              {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
            </div>
            {uploadedAttachments && uploadedAttachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {uploadedAttachments.map(att => (
                  <div key={att.id} className="rounded-md overflow-hidden border bg-black/20">
                    {att.kind === 'image' && (
                      <img src={att.url} alt="attachment" className="w-full h-20 object-cover" />
                    )}
                    {att.kind === 'video' && (
                      <video src={att.url} className="w-full h-20 object-cover" controls preload="metadata" />
                    )}
                    {att.kind !== 'image' && att.kind !== 'video' && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs p-2 inline-block w-full truncate">
                        {att.url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!title.trim()) return
                onAdd({ title, copy, platform, type, status, attachments: [...(uploadedAttachments || []), ...(addAttachmentFromUrl(attachmentUrl) || [])] })
                setTitle('')
                setCopy('')
                setAttachmentUrl('')
                setUploadedAttachments([])
              }}
            >
              Add to Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'pdf':
      case 'document':
        return <FileText className="h-4 w-4" />
      default:
        return <FileIcon className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {user?.role === 'project_manager' || user?.role === 'employee' ? 'My Projects' : 'Projects'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {user?.role === 'project_manager' || user?.role === 'employee'
              ? 'All your assigned projects and collaborations'
              : 'Manage all your video production projects'}
          </p>
        </div>
        {(user?.role === 'admin') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Enter the project details to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      placeholder="Brand Video Production"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                      required
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <SelectItem value="none" disabled>No clients available</SelectItem>
                        ) : (
                          clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {clients.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Add a client first before creating a project
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service">Service Type *</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                      required
                    >
                      <SelectTrigger id="service">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SERVICE_TYPES).map((service) => (
                          <SelectItem key={service.value} value={service.value}>
                            <span className="flex items-center gap-2">
                              <span>{service.icon}</span>
                              <span>{service.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {SERVICE_TYPES[formData.service_type].description}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief project description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="budget">Budget (₹)</Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="10000"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: ProjectStatus) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger id="status">
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
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || clients.length === 0}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? 'Creating...' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Project Stats */}
      {!loading && projects.length > 0 && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Projects</CardDescription>
              <CardTitle className="text-2xl">{projectStats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {projectStats.active} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Completed</CardDescription>
              <CardTitle className="text-2xl">{projectStats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {projects.length > 0 ? Math.round((projectStats.completed / projects.length) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Budget</CardDescription>
              <CardTitle className="text-2xl">₹{Math.round(projectStats.totalBudget / 1000)}k</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg Progress</CardDescription>
              <CardTitle className="text-2xl">{projectStats.avgProgress}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={projectStats.avgProgress} className="h-1" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Type Filter Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {Object.values(SERVICE_TYPES).map((service) => {
          const serviceProjects = projects.filter(p => p.service_type === service.value)
          const isSelected = serviceFilter === service.value
          return (
            <Card
              key={service.value}
              className={`cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setServiceFilter(isSelected ? 'all' : service.value)}
            >
              <CardHeader className={`pb-3 bg-gradient-to-br ${service.color} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{service.icon}</div>
                    <div>
                      <CardTitle className="text-lg text-white">{service.label}</CardTitle>
                      <CardDescription className="text-white/90 text-xs">{service.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{serviceProjects.length}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {serviceProjects.filter(p => p.status === 'completed').length} Completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {serviceProjects.filter(p => p.status === 'in_progress').length} In Progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="video_production">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.video_production.icon} Video Production
              </span>
            </SelectItem>
            <SelectItem value="social_media">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.social_media.icon} Social Media
              </span>
            </SelectItem>
            <SelectItem value="design_branding">
              <span className="flex items-center gap-2">
                {SERVICE_TYPES.design_branding.icon} Design & Branding
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="stuck">Stuck</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {
        loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Get started by creating your first project</p>
              <Button onClick={() => setIsDialogOpen(true)} disabled={clients.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Project
              </Button>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Add a client first in the Clients page
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No projects match your search</p>
                </CardContent>
              </Card>
            ) : (
              filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openProjectDetails(project)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openProjectDetails(project);
                    }
                  }}
                  className="group relative overflow-hidden cursor-pointer rounded-2xl bg-white/10 dark:bg-white/5 border border-white/20 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/15 shadow-lg hover:shadow-xl transition-all duration-200 supports-[backdrop-filter]:backdrop-blur-lg hover:-translate-y-0.5"
                >
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent dark:from-white/10 dark:to-transparent" />
                  <CardHeader className="relative z-10">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Thumbnail */}
                      {project.thumbnail_url && (
                        <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                          <img
                            src={project.thumbnail_url}
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => openProjectDetails(project)}>
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle>{project.name}</CardTitle>
                            </div>
                            <CardDescription className="mt-1">
                              {project.clients?.company_name || 'No client'}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getServiceBadgeVariant(project.service_type)}>
                              <span className="mr-1">{getServiceIcon(project.service_type)}</span>
                              {getServiceLabel(project.service_type)}
                            </Badge>
                            <StatusBadge status={project.status} />
                          </div>
                        </div>

                        {/* Team & Progress Row */}
                        <div className="flex flex-col gap-3 text-sm">
                          {/* Creator */}
                          {project.created_by && projectCreators[project.created_by] && (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {projectCreators[project.created_by].full_name}
                              </span>
                            </div>
                          )}

                          {/* Team Members */}
                          {projectTeam[project.id] && projectTeam[project.id].length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex gap-1 flex-wrap">
                                {projectTeam[project.id].map((member) => (
                                  <Badge key={member.id} variant="secondary" className="text-xs">
                                    {member.full_name || member.email.split('@')[0]}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Progress */}
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{project.progress_percentage}% complete</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-3">
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {project.deadline && (
                        <div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            Deadline
                          </div>
                          <p className="font-medium">{new Date(project.deadline).toLocaleDateString()}</p>
                        </div>
                      )}
                      {project.budget && (
                        <div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            Budget
                          </div>
                          <p className="font-medium">₹{project.budget.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{project.progress_percentage}%</span>
                        </div>
                        <Progress value={project.progress_percentage} className="h-1.5" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProjectDetails(project);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(project);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTeamDialog(project);
                        }}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Team
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoices(project);
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card >
              ))
            )
            }
          </div >
        )
      }

      {/* Project Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/10 dark:bg-white/5 border-white/20 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-xl">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent dark:from-white/10 dark:to-transparent rounded-t-2xl" />
          {selectedProject && (
            <div className="relative z-10">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedProject.name}</DialogTitle>
                    <DialogDescription className="mt-2">
                      Client: {selectedProject.clients?.company_name || 'No client'}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getServiceBadgeVariant(selectedProject.service_type)}>
                      <span className="mr-1">{getServiceIcon(selectedProject.service_type)}</span>
                      {getServiceLabel(selectedProject.service_type)}
                    </Badge>
                    <StatusBadge status={selectedProject.status} />
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Project Overview */}
                <div>
                  <h3 className="font-semibold mb-3">Project Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedProject.budget && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          Budget
                        </div>
                        <p className="font-semibold">₹{selectedProject.budget.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedProject.start_date && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          Start Date
                        </div>
                        <p className="font-semibold">{new Date(selectedProject.start_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedProject.deadline && (
                      <div className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Deadline
                        </div>
                        <p className="font-semibold">{new Date(selectedProject.deadline).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Progress
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedProject.progress_percentage} className="h-2 flex-1" />
                        <span className="font-semibold text-sm">{selectedProject.progress_percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                  </div>
                )}

                {/* Actions (only for Social Media projects) */}
                {selectedProject?.service_type === 'social_media' && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => setIsCalendarDialogOpen(true)}>
                      Content Calendar
                    </Button>
                  </div>
                )}

                {/* Sub-Projects (Tasks) Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Sub-Projects / Tasks
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setIsSubProjectDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                  </div>
                  {subProjects[selectedProject.id] && subProjects[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {subProjects[selectedProject.id].map((subProject) => (
                        <Card key={subProject.id} className="hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{subProject.name}</h4>
                                    <StatusBadge status={subProject.status} />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        setSelectedSubProject(subProject)
                                        setEditSubProjectFormData({
                                          name: subProject.name,
                                          description: subProject.description || "",
                                          assigned_to: subProject.assigned_to || "unassigned",
                                          due_date: subProject.due_date || "",
                                          status: subProject.status,
                                          video_url: subProject.video_url || "",
                                        })
                                        setIsEditSubProjectDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
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
                                <Select
                                  value={subProject.status}
                                  onValueChange={(value: ProjectStatus) => handleUpdateSubProjectStatus(subProject.id, value)}
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
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={subProject.progress_percentage} className="h-2 flex-1" />
                                  <span className="text-xs font-medium w-10 text-right">{subProject.progress_percentage}%</span>
                                </div>
                                <Input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={subProject.progress_percentage}
                                  onChange={(e) => handleUpdateSubProjectProgress(subProject.id, parseInt(e.target.value))}
                                  className="h-2"
                                />
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
                          No tasks yet. Break down this project into smaller tasks.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Milestones Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Milestones</h3>
                    <Button size="sm" variant="outline" onClick={() => setIsMilestoneDialogOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Milestone
                    </Button>
                  </div>
                  {projectMilestones[selectedProject.id] && projectMilestones[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {projectMilestones[selectedProject.id].map((milestone) => (
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
                              <div className="flex items-center gap-2">
                                <Select
                                  value={milestone.status}
                                  onValueChange={(val) => handleMilestoneStatusChange(selectedProject.id, milestone.id, val as MilestoneStatus)}
                                >
                                  <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {milestoneStatusOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteMilestone(selectedProject.id, milestone.id)}
                                  title="Delete milestone"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                          No milestones yet. Add milestones to track project progress.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Team Members</h3>
                    {user?.role === 'admin' && (
                      <Button size="sm" variant="outline" onClick={() => setIsTeamDialogOpen(true)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Assign Member
                      </Button>
                    )}
                  </div>
                  {projectTeam[selectedProject.id] && projectTeam[selectedProject.id].length > 0 ? (
                    <div className="space-y-2">
                      {projectTeam[selectedProject.id].map((member) => (
                        <Card key={member.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {member.full_name?.charAt(0) || member.email.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{member.full_name || member.email}</p>
                                  <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                              </div>
                              {user?.role === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTeamMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
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

                {/* Files & Documents */}
                <div>
                  <h3 className="font-semibold mb-3">Files & Documents</h3>
                  <FileManager
                    projectId={selectedProject.id}
                    driveFolderUrl={selectedProject.drive_folder_url}
                    onDriveFolderUpdate={(url) => {
                      setSelectedProject({ ...selectedProject, drive_folder_url: url })
                      // Update in the projects list
                      setProjects(prevProjects =>
                        prevProjects.map(p =>
                          p.id === selectedProject.id
                            ? { ...p, drive_folder_url: url }
                            : p
                        )
                      )
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Content Calendar Dialog */}
      {/* Calendar only for Social Media projects */}
      <Dialog open={isCalendarDialogOpen && selectedProject?.service_type === 'social_media'} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/10 dark:bg-white/5 border-white/20 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-xl">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent dark:from-white/10 dark:to-transparent rounded-t-2xl" />
          <div className="relative z-10 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">Content Calendar</DialogTitle>
              <DialogDescription>
                Plan and manage content for {selectedProject?.name || 'project'}
              </DialogDescription>
            </DialogHeader>
            <CalendarView
              events={calendarEvents}
              onCreate={(date) => handleCreateCalendarEvent(date)}
              onUpdate={(event) => handleUpdateCalendarEvent(event)}
              onDelete={(eventId) => handleDeleteCalendarEvent(eventId)}
              onOpenDate={(date, events) => {
                setDateDetails({ date, events })
                setIsDateDetailsOpen(true)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Date Details Dialog */}
      <Dialog open={isDateDetailsOpen} onOpenChange={setIsDateDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white/10 dark:bg-white/5 border-white/20 ring-1 ring-white/10 supports-[backdrop-filter]:backdrop-blur-xl">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent dark:from-white/10 dark:to-transparent rounded-t-2xl" />
          <div className="relative z-10 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">{dateDetails ? new Date(dateDetails.date).toLocaleDateString() : 'Date'}</DialogTitle>
              <DialogDescription>Detailed content planning</DialogDescription>
            </DialogHeader>

            {/* Quick add form */}
            <DateQuickAddForm
              onAdd={(payload) => {
                const baseDate = dateDetails?.date || new Date()
                const newEvent: CalendarEvent = {
                  id: Math.random().toString(36).slice(2),
                  date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).toISOString(),
                  title: payload.title,
                  platform: payload.platform,
                  type: payload.type,
                  status: payload.status,
                  attachments: payload.attachments || [],
                }
                setCalendarEvents(prev => [...prev, newEvent])
              }}
            />

            {/* Existing events list */}
            <div className="space-y-3">
              {(dateDetails?.events || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No content entries for this day</p>
              ) : (
                (dateDetails?.events || []).map(ev => (
                  <div key={ev.id} className="rounded-md border p-3 bg-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ev.title}</span>
                        {ev.platform && (<Badge variant="outline" className="text-[10px]">{ev.platform}</Badge>)}
                        {ev.type && (<Badge variant="outline" className="text-[10px]">{ev.type}</Badge>)}
                        {ev.status && (<Badge variant="outline" className="text-[10px]">{ev.status}</Badge>)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCalendarEvent(ev.id)}>Delete</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleUpdateCalendarEvent({ ...ev, status: ev.status === 'published' ? 'scheduled' : 'published' })}>
                          {ev.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>
                    </div>
                    {ev.copy && (
                      <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                        {ev.copy}
                      </div>
                    )}
                    {ev.attachments && ev.attachments.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {ev.attachments.map(att => (
                          <div key={att.id} className="rounded-md overflow-hidden border bg-black/20">
                            {att.kind === 'image' && (
                              <img src={att.url} alt="attachment" className="w-full h-24 object-cover" />
                            )}
                            {att.kind === 'video' && (
                              <video src={att.url} className="w-full h-24 object-cover" controls preload="metadata" />
                            )}
                            {att.kind !== 'image' && att.kind !== 'video' && (
                              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs p-2 inline-block w-full truncate">
                                {att.url}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAddMilestone}>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>
                Create a new milestone for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="milestone-title">Title *</Label>
                <Input
                  id="milestone-title"
                  placeholder="Script completion"
                  required
                  value={milestoneFormData.title}
                  onChange={(e) => setMilestoneFormData({ ...milestoneFormData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="milestone-desc">Description</Label>
                <Textarea
                  id="milestone-desc"
                  placeholder="Complete final draft of script"
                  value={milestoneFormData.description}
                  onChange={(e) => setMilestoneFormData({ ...milestoneFormData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="milestone-date">Due Date</Label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={milestoneFormData.due_date}
                  onChange={(e) => setMilestoneFormData({ ...milestoneFormData, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMilestoneDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Team Member Dialog */}
      {
        user?.role === 'admin' && (
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>Team Members</DialogTitle>
                    <DialogDescription>
                      Manage team members for {selectedProject?.name}
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedProject && fetchProjectTeamMembers(selectedProject.id)}
                    className="gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                      <path d="M21 3v5h-5"></path>
                    </svg>
                    Refresh
                  </Button>
                </div>
              </DialogHeader>

              {/* Current Team Members */}
              <div className="space-y-4 py-4">
                {/* Debug Info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800 space-y-1">
                    <div><strong>Debug Info:</strong></div>
                    <div>Project ID: <code>{selectedProject?.id}</code></div>
                    <div>Team Count: <code>{projectTeam[selectedProject?.id || '']?.length || 0}</code></div>
                    <div>Has Team Data: <code>{projectTeam[selectedProject?.id || ''] ? 'Yes' : 'No'}</code></div>
                    <div>All Projects with Teams: <code>{Object.keys(projectTeam).length}</code></div>
                    {projectTeam[selectedProject?.id || ''] && (
                      <div>Members: <code>{projectTeam[selectedProject?.id || ''].map(m => m.email).join(', ')}</code></div>
                    )}
                  </div>
                )}

                {/* Team Stats */}
                {projectTeam[selectedProject?.id || ''] && projectTeam[selectedProject?.id || ''].length > 0 && (
                  <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{projectTeam[selectedProject?.id || ''].length}</p>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {projectTeam[selectedProject?.id || ''].filter(m => m.role === 'admin').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Admins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {projectTeam[selectedProject?.id || ''].filter(m => m.role === 'project_manager').length}
                      </p>
                      <p className="text-xs text-muted-foreground">PMs</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Current Team Members ({projectTeam[selectedProject?.id || '']?.length || 0})</h3>
                  {projectTeam[selectedProject?.id || ''] && projectTeam[selectedProject?.id || ''].length > 0 ? (
                    <div className="space-y-2">
                      {projectTeam[selectedProject?.id || ''].map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{member.full_name || member.email}</p>
                                <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                  {member.role === 'admin' ? 'Admin' : 'PM'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTeamMember(member.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No team members assigned yet
                    </div>
                  )}
                </div>

                {/* Add Team Member Form */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Add Team Member</h3>
                  <form onSubmit={handleAssignTeamMember}>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="team-member">Team Member *</Label>
                        <Select
                          value={selectedUserId}
                          onValueChange={setSelectedUserId}
                          required
                        >
                          <SelectTrigger id="team-member">
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.length === 0 ? (
                              <SelectItem value="none" disabled>No users available</SelectItem>
                            ) : (
                              availableUsers
                                .filter(u => !projectTeam[selectedProject?.id || '']?.find(m => m.id === u.id))
                                .map((availableUser) => (
                                  <SelectItem key={availableUser.id} value={availableUser.id}>
                                    {availableUser.full_name} ({availableUser.email})
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="team-role">Role (Optional)</Label>
                        <Input
                          id="team-role"
                          placeholder="e.g., Lead Editor, Designer"
                          value={teamRole}
                          onChange={(e) => setTeamRole(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTeamDialogOpen(false)}
                        disabled={submitting}
                      >
                        Close
                      </Button>
                      <Button type="submit" disabled={submitting || !selectedUserId}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign Member
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEditProject}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client">Client *</Label>
                <Select
                  value={editFormData.client_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, client_id: value })}
                  required
                >
                  <SelectTrigger id="edit-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Project description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-service">Service Type *</Label>
                  <Select
                    value={editFormData.service_type}
                    onValueChange={(value: ServiceType) => setEditFormData({ ...editFormData, service_type: value })}
                    required
                  >
                    <SelectTrigger id="edit-service">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="mr-2">{type.icon}</span>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value: ProjectStatus) => setEditFormData({ ...editFormData, status: value })}
                    required
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="stuck">Stuck</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-budget">Budget (₹)</Label>
                  <Input
                    id="edit-budget"
                    type="number"
                    placeholder="100000"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-progress">Progress (%)</Label>
                  <Input
                    id="edit-progress"
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.progress_percentage}
                    onChange={(e) => setEditFormData({ ...editFormData, progress_percentage: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Sub-Project Dialog */}
      <Dialog open={isSubProjectDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing dialog to prevent stuck states
          setSubProjectFormData({ name: "", description: "", assigned_to: "unassigned", due_date: "", status: "planning", video_url: "" })
        }
        setIsSubProjectDialogOpen(open)
      }}>
        <DialogContent>
          <form onSubmit={handleAddSubProject}>
            <DialogHeader>
              <DialogTitle>Add Sub-Project / Task</DialogTitle>
              <DialogDescription>
                Create a task for {selectedProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="sub-project-name">Task Name *</Label>
                <Input
                  id="sub-project-name"
                  placeholder="e.g., Script Writing, Video Editing"
                  required
                  value={subProjectFormData.name}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-desc">Description</Label>
                <Textarea
                  id="sub-project-desc"
                  placeholder="Task details..."
                  value={subProjectFormData.description}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sub-project-assign">Assign To</Label>
                  <Select
                    value={subProjectFormData.assigned_to}
                    onValueChange={(value) => setSubProjectFormData({ ...subProjectFormData, assigned_to: value })}
                  >
                    <SelectTrigger id="sub-project-assign">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableUsers.map((availableUser) => (
                        <SelectItem key={availableUser.id} value={availableUser.id}>
                          {availableUser.full_name || availableUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sub-project-status">Status</Label>
                  <Select
                    value={subProjectFormData.status}
                    onValueChange={(value: ProjectStatus) => setSubProjectFormData({ ...subProjectFormData, status: value })}
                  >
                    <SelectTrigger id="sub-project-status">
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
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-date">Due Date</Label>
                <Input
                  id="sub-project-date"
                  type="date"
                  value={subProjectFormData.due_date}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, due_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-project-video">Video URL (Optional)</Label>
                <Input
                  id="sub-project-video"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={subProjectFormData.video_url}
                  onChange={(e) => setSubProjectFormData({ ...subProjectFormData, video_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube, Google Drive, or other video link
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubProjectDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !subProjectFormData.name.trim()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Creating Task...' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sub-Project Dialog */}
      <Dialog open={isEditSubProjectDialogOpen} onOpenChange={setIsEditSubProjectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEditSubProject}>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details for this project
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-name">Task Name *</Label>
                <Input
                  id="edit-sub-project-name"
                  value={editSubProjectFormData.name}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-description">Description</Label>
                <Textarea
                  id="edit-sub-project-description"
                  value={editSubProjectFormData.description}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-assigned">Assigned To</Label>
                  <Select
                    value={editSubProjectFormData.assigned_to}
                    onValueChange={(value) => setEditSubProjectFormData({ ...editSubProjectFormData, assigned_to: value })}
                  >
                    <SelectTrigger id="edit-sub-project-assigned">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {availableUsers.map((availableUser) => (
                        <SelectItem key={availableUser.id} value={availableUser.id}>
                          {availableUser.full_name || availableUser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sub-project-status">Status</Label>
                  <Select
                    value={editSubProjectFormData.status}
                    onValueChange={(value: ProjectStatus) => setEditSubProjectFormData({ ...editSubProjectFormData, status: value })}
                  >
                    <SelectTrigger id="edit-sub-project-status">
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
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-date">Due Date</Label>
                <Input
                  id="edit-sub-project-date"
                  type="date"
                  value={editSubProjectFormData.due_date}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, due_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sub-project-video">Video URL (Optional)</Label>
                <Input
                  id="edit-sub-project-video"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={editSubProjectFormData.video_url}
                  onChange={(e) => setEditSubProjectFormData({ ...editSubProjectFormData, video_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Add a YouTube, Google Drive, or other video link
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditSubProjectDialogOpen(false)
                  setSelectedSubProject(null)
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ProjectsPageContent />
    </Suspense>
  )
}
