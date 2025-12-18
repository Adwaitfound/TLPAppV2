"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "./audit-log"

export async function createTask(data: {
    title: string
    description?: string
    project_id?: string
    proposed_project_name?: string
    proposed_project_vertical?: 'video_production' | 'social_media' | 'design_branding'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    due_date?: string
    estimated_hours?: number
}) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    console.log('[createTask] Creating task for user:', user.id, user.email, 'Data:', data)

    const payload: any = {
        user_id: user.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date,
        estimated_hours: data.estimated_hours,
        project_id: data.project_id,
    }

    // Only add proposal fields if proposing a new project
    if (!data.project_id && data.proposed_project_name) {
        payload.proposed_project_name = data.proposed_project_name
        // Only set vertical if it's not empty string
        if (data.proposed_project_vertical && data.proposed_project_vertical.trim()) {
            payload.proposed_project_vertical = data.proposed_project_vertical
        }
        payload.proposed_project_status = 'pending'
        console.log('[createTask] Setting proposed project status to pending')
    }

    const { data: task, error } = await supabase
        .from('employee_tasks')
        .insert(payload)
        .select()
        .single()

    console.log('[createTask] Result:', { task, error })

    if (error) {
        console.error("Create task error:", error)

        // Log the failure
        await logAuditEvent({
            action: 'create',
            entityType: 'task',
            entityName: data.title,
            status: 'error',
            errorMessage: error.message,
            details: { ...data },
        }).catch(e => console.warn('Failed to log audit event:', e))

        return { error: error.message }
    }

    // Log successful task creation
    await logAuditEvent({
        action: 'create',
        entityType: 'task',
        entityId: task.id,
        entityName: task.title,
        status: 'success',
        newValues: {
            title: task.title,
            project_id: task.project_id,
            proposed_project_name: task.proposed_project_name,
            proposed_project_vertical: task.proposed_project_vertical,
            priority: task.priority,
        },
        details: {
            description: task.description,
            due_date: task.due_date,
            is_proposal: !!task.proposed_project_name,
        },
    }).catch(e => console.warn('Failed to log audit event:', e))

    revalidatePath('/dashboard/employee')
    return { data: task }
}

export async function updateTask(taskId: string, updates: {
    title?: string
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    status?: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
    due_date?: string
    estimated_hours?: number
    actual_hours?: number
}) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    const updateData: any = { ...updates }

    // Set completed_at when marking as completed
    if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
    }

    const { data: task, error } = await supabase
        .from('employee_tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) {
        console.error("Update task error:", error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/employee')
    return { data: task }
}

export async function deleteTask(taskId: string) {
    console.log('[deleteTask] 🔵 START - TaskID:', taskId)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.log('[deleteTask] ❌ AUTH FAILED:', authError)
        return { error: "Unauthorized" }
    }
    console.log('[deleteTask] ✅ Auth user:', user.id)

    console.log('[deleteTask] Attempting delete from employee_tasks where id=' + taskId + ' AND user_id=' + user.id)
    const { error } = await supabase
        .from('employee_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) {
        console.error('[deleteTask] ❌ Delete error:', error)

        // Log the failure
        await logAuditEvent({
            action: 'delete',
            entityType: 'task',
            entityId: taskId,
            status: 'error',
            errorMessage: error.message,
        }).catch(e => console.warn('Failed to log audit event:', e))

        return { error: error.message }
    }

    console.log('[deleteTask] ✅ Task deleted successfully')

    // Log successful deletion
    await logAuditEvent({
        action: 'delete',
        entityType: 'task',
        entityId: taskId,
        status: 'success',
    }).catch(e => console.warn('Failed to log audit event:', e))

    revalidatePath('/dashboard/employee')
    console.log('[deleteTask] ✅ Path revalidated')
    return { success: true }
}

export async function getTasks(filter?: {
    status?: string
    priority?: string
    project_id?: string
}) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    let query = supabase
        .from('employee_tasks')
        .select('*, projects(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (filter?.status) {
        query = query.eq('status', filter.status)
    }
    if (filter?.priority) {
        query = query.eq('priority', filter.priority)
    }
    if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
    }

    const { data, error } = await query

    if (error) {
        console.error("Get tasks error:", error)
        return { error: error.message }
    }

    return { data }
}

export async function getTodayTasks() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.error('[getTodayTasks] Auth error:', authError)
        return { error: "Unauthorized" }
    }

    console.log('[getTodayTasks] User ID:', user.id, 'Email:', user.email)

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    console.log('[getTodayTasks] User role:', profile?.role, 'Profile error:', profileError)

    const today = new Date().toISOString().split('T')[0]

    let query = supabase
        .from('employee_tasks')
        .select('*, projects(name)')

    // Only filter by user_id if the user is an employee
    // Admins and clients can see all tasks
    const isEmployee = profile?.role === 'employee'
    console.log('[getTodayTasks] Is employee:', isEmployee, 'Will filter by user_id:', isEmployee)

    if (isEmployee) {
        query = query.eq('user_id', user.id)
    }

    // Get active tasks (not completed/cancelled)
    const activeQuery = query
        .neq('status', 'completed')
        .neq('status', 'cancelled')

    const { data: activeTasks, error: activeError } = await activeQuery

    // Also get any tasks with proposals (pending, approved, or rejected) so employees can track them
    let proposalQuery = supabase
        .from('employee_tasks')
        .select('*, projects(name)')
        .not('proposed_project_status', 'is', null)  // Get any task with a proposal status

    if (isEmployee) {
        proposalQuery = proposalQuery.eq('user_id', user.id)
    }

    const { data: proposalTasks, error: proposalError } = await proposalQuery

    // Merge the two arrays, removing duplicates
    const taskMap = new Map()
    activeTasks?.forEach(t => taskMap.set(t.id, t))
    proposalTasks?.forEach(t => taskMap.set(t.id, t))
    const data = Array.from(taskMap.values())
        .sort((a, b) => {
            // Sort by priority first, then by due date
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
            const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2) -
                (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2)
            if (priorityDiff !== 0) return priorityDiff
            return (a.due_date || '').localeCompare(b.due_date || '')
        })

    const error = activeError || proposalError
    console.log('[getTodayTasks] Query result: active tasks:', activeTasks?.length, 'proposal tasks:', proposalTasks?.length, 'merged:', data.length, { error, data })

    if (error) {
        console.error("Get today tasks error:", error)
        return { error: error.message }
    }

    return { data }
}

export async function getOverdueTasks() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Get user profile to check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const today = new Date().toISOString().split('T')[0]

    let query = supabase
        .from('employee_tasks')
        .select('*, projects(name)')
        .lt('due_date', today)
        .neq('status', 'completed')
        .neq('status', 'cancelled')

    // Only filter by user_id if the user is an employee
    if (profile?.role === 'employee') {
        query = query.eq('user_id', user.id)
    }

    query = query.order('due_date', { ascending: true })

    const { data, error } = await query

    console.log('[getOverdueTasks] Query result:', { count: data?.length, data })

    if (error) {
        console.error("Get overdue tasks error:", error)
        return { error: error.message }
    }

    return { data }
}

export async function assignTaskToEmployee(data: {
    employee_id: string
    title: string
    description?: string
    project_id?: string
    proposed_project_name?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    due_date?: string
    estimated_hours?: number
}) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Check if admin or project manager
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userError || !userData) {
        return { error: "Failed to verify permissions" }
    }

    if (userData.role !== 'admin' && userData.role !== 'project_manager') {
        return { error: "Only admins and project managers can assign tasks" }
    }

    const payload: any = {
        user_id: data.employee_id,
        title: data.title,
        description: data.description,
        project_id: data.project_id,
        proposed_project_name: data.proposed_project_name,
        priority: data.priority || 'medium',
        due_date: data.due_date,
        estimated_hours: data.estimated_hours,
    }

    if (!data.project_id && data.proposed_project_name) {
        payload.proposed_project_status = 'pending'
    }

    const { data: task, error } = await supabase
        .from('employee_tasks')
        .insert(payload)
        .select()
        .single()

    if (error) {
        console.error("Assign task error:", error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/employee')
    return { data: task }
}

export async function getPendingProjectProposals() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    const { data: roleData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'project_manager')) {
        return { error: "Only admins and project managers can view proposals" }
    }

    const { data, error } = await supabase
        .from('employee_tasks')
        .select('id, title, description, proposed_project_name, proposed_project_vertical, proposed_project_status, proposed_project_notes, user_id, created_at, users:users!employee_tasks_user_id_fkey(full_name, email), project_id, projects(name)')
        .not('proposed_project_name', 'is', null)
        .eq('proposed_project_status', 'pending')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Get pending proposals error:', error)
        return { error: error.message }
    }

    return { data }
}

export async function reviewProjectProposal(args: {
    taskId: string
    decision: 'approved' | 'rejected'
    projectId?: string
    notes?: string
}) {
    console.log('[reviewProjectProposal] 🔵 START - Decision:', args.decision, 'TaskID:', args.taskId, 'ProjectID:', args.projectId)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.log('[reviewProjectProposal] ❌ AUTH FAILED:', authError)
        return { error: "Unauthorized" }
    }
    console.log('[reviewProjectProposal] ✅ Auth user:', user.id, user.email)

    const { data: roleData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (roleError || !roleData || (roleData.role !== 'admin' && roleData.role !== 'project_manager')) {
        console.log('[reviewProjectProposal] ❌ ROLE CHECK FAILED:', roleData?.role)
        return { error: "Only admins and project managers can review proposals" }
    }
    console.log('[reviewProjectProposal] ✅ Role check passed:', roleData.role)

    const updateData: any = {
        proposed_project_status: args.decision,
        proposed_project_reviewed_by: user.id,
        proposed_project_reviewed_at: new Date().toISOString(),
        proposed_project_notes: args.notes,
    }

    // If approving and no project_id provided, create a new project
    if (args.decision === 'approved' && !args.projectId) {
        console.log('[reviewProjectProposal] 🔷 CREATING NEW PROJECT FROM PROPOSAL')

        // First, fetch the task to get the proposal details AND employee info
        const { data: task, error: taskError } = await supabase
            .from('employee_tasks')
            .select('proposed_project_name, proposed_project_vertical, user_id')
            .eq('id', args.taskId)
            .single()

        console.log('[reviewProjectProposal] Task fetch:', { error: taskError, task: task })
        if (taskError || !task) {
            console.log('[reviewProjectProposal] ❌ TASK FETCH FAILED')
            return { error: "Failed to fetch task details" }
        }
        console.log('[reviewProjectProposal] ✅ Task fetched - Name:', task.proposed_project_name, 'Vertical:', task.proposed_project_vertical, 'Employee:', task.user_id)

        // Create a new project from the proposal
        console.log('[reviewProjectProposal] 🔶 Attempting to create project with:', {
            name: task.proposed_project_name,
            service_type: task.proposed_project_vertical || 'video_production',
            status: 'planning',
            created_by: user.id
        })

        const { data: newProject, error: projectError } = await supabase
            .from('projects')
            .insert({
                name: task.proposed_project_name,
                service_type: task.proposed_project_vertical || 'video_production',
                status: 'planning',
                progress_percentage: 0,
                created_by: user.id,
                // client_id can be null initially - project created from proposal doesn't need a client yet
            })
            .select()
            .single()

        console.log('[reviewProjectProposal] Project insert result:', { error: projectError, newProject: newProject })

        if (projectError) {
            console.error('[reviewProjectProposal] ❌ Project creation failed:', projectError)
            // Continue with approval even if project creation fails
            // return { error: projectError.message }
        } else if (newProject) {
            console.log('[reviewProjectProposal] ✅ Project created successfully! ID:', newProject.id)
            updateData.project_id = newProject.id
            console.log('[reviewProjectProposal] Updated updateData.project_id =', newProject.id)

            // Add both the admin and the employee to the project team
            console.log('[reviewProjectProposal] 🔷 Adding team members to project:', newProject.id)
            console.log('[reviewProjectProposal] Team members to add:', [
                { project_id: newProject.id, user_id: user.id, role: 'Admin who approved' },
                { project_id: newProject.id, user_id: task.user_id, role: 'Employee who requested' }
            ])

            try {
                const teamMembers = [
                    { project_id: newProject.id, user_id: user.id },  // Admin who approved
                    { project_id: newProject.id, user_id: task.user_id }  // Employee who requested
                ]

                const { error: teamError, data: teamData } = await supabase
                    .from('project_team')
                    .insert(teamMembers)
                    .select()

                console.log('[reviewProjectProposal] Team insert result:', { error: teamError, data: teamData })

                if (teamError) {
                    console.error('[reviewProjectProposal] ❌ Failed to add team members:', teamError)
                } else {
                    console.log('[reviewProjectProposal] ✅ Team members added successfully! Rows:', teamData?.length)
                }
            } catch (err) {
                console.error('[reviewProjectProposal] ❌ Error adding team members:', err)
            }
        }
    } else if (args.projectId && args.decision === 'approved') {
        console.log('[reviewProjectProposal] 🔷 Linking existing project:', args.projectId)
        updateData.project_id = args.projectId
    }

    const { data, error } = await supabase
        .from('employee_tasks')
        .update(updateData)
        .eq('id', args.taskId)
        .select()
        .single()

    if (error) {
        console.error('Review proposal error:', error)

        // Log the failure
        await logAuditEvent({
            action: args.decision === 'approved' ? 'approve' : 'reject',
            entityType: 'proposal',
            entityId: args.taskId,
            status: 'error',
            errorMessage: error.message,
            details: { decision: args.decision, notes: args.notes },
        }).catch(e => console.warn('Failed to log audit event:', e))

        return { error: error.message }
    }

    // Log successful approval/rejection
    await logAuditEvent({
        action: args.decision === 'approved' ? 'approve' : 'reject',
        entityType: 'proposal',
        entityId: args.taskId,
        status: 'success',
        newValues: updateData,
        details: {
            decision: args.decision,
            notes: args.notes,
            project_created: !!data?.project_id,
        },
    }).catch(e => console.warn('Failed to log audit event:', e))

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/employee')
    return { data }
}

export async function debugAllUserTasks() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "Unauthorized" }
    }

    // Get ALL tasks for this user without any filters
    const { data, error } = await supabase
        .from('employee_tasks')
        .select('id, title, status, proposed_project_name, proposed_project_status, user_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    console.log('[debugAllUserTasks] ALL tasks for user', user.id, ':', { count: data?.length, data, error })

    return { data, error }
}
