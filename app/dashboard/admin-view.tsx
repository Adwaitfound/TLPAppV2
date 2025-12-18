"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { DollarSign, FolderKanban, FileText, Plus, Calendar, Users, TrendingUp, AlertCircle, CheckCircle2, Receipt, Bell, Clock } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { Project, Client, Invoice, Milestone } from "@/types"
import { SERVICE_TYPES, type ServiceType } from "@/types"
import { reviewProjectProposal } from "@/app/actions/employee-tasks"
import { approveUserAccount } from "@/app/actions/approve-user"
import { grantAdminByEmail } from "@/app/actions/grant-admin"
import { forceConfirmEmail } from "@/app/actions/force-confirm-email"

type PendingUser = {
    id: string
    email: string
    full_name?: string | null
    role: string
    company_name?: string | null
    created_at?: string
    status?: string | null
}

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [proposals, setProposals] = useState<any[]>([])
    const [proposalSelections, setProposalSelections] = useState<Record<string, string>>({})
    const [proposalLoading, setProposalLoading] = useState(false)
    const [proposalSubmitting, setProposalSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [timePeriodFilter, setTimePeriodFilter] = useState("all")
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
    const [pendingUsersLoading, setPendingUsersLoading] = useState(false)
    const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null)
    const [devToolsOpen, setDevToolsOpen] = useState(false)
    const [grantAdminEmail, setGrantAdminEmail] = useState("")
    const [grantingAdmin, setGrantingAdmin] = useState(false)
    const [bannerEmail, setBannerEmail] = useState("")
    const [bannerProcessing, setBannerProcessing] = useState(false)
    const [confirmEmailInput, setConfirmEmailInput] = useState("")
    const [confirmingEmail, setConfirmingEmail] = useState(false)

    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeProjects: 0,
        pendingInvoices: 0,
        totalClients: 0,
        overdueInvoices: 0,
        completedProjects: 0,
        avgProjectValue: 0,
    })

    const [serviceBreakdown, setServiceBreakdown] = useState<{
        service_type: ServiceType
        count: number
        percentage: number
    }[]>([])

    useEffect(() => {
        async function fetchDashboardData() {
            if (!user || authLoading) return
            setError(null)
            setLoading(true)

            const supabase = createClient()

            try {
                // Fetch projects
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .order('created_at', { ascending: false })

                if (projectsError) {
                    setError('Unable to load projects right now. Please retry.')
                    return
                }

                // Fetch invoices
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select('*, clients(company_name)')
                    .order('created_at', { ascending: false })

                if (invoicesError) {
                    setError('Unable to load invoices right now. Please retry.')
                    return
                }

                // Fetch clients
                const { data: clientsData, error: clientsError } = await supabase
                    .from('clients')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (clientsError) {
                    setError('Unable to load clients right now. Please retry.')
                    return
                }

                // Fetch upcoming milestones
                const { data: milestonesData, error: milestonesError } = await supabase
                    .from('milestones')
                    .select('*, projects(name)')
                    .in('status', ['pending', 'in_progress'])
                    .order('due_date', { ascending: true })
                    .limit(5)

                if (milestonesError) {
                    setError('Unable to load milestones right now. Please retry.')
                    return
                }

                setProjects(projectsData || [])
                setInvoices(invoicesData || [])
                setClients(clientsData || [])
                setMilestones(milestonesData || [])

                // Calculate stats
                const totalRevenue = invoicesData?.filter(inv => inv.status === 'paid')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
                const activeProjects = projectsData?.filter(p => p.status === 'in_progress').length || 0
                const pendingInvoices = invoicesData?.filter(inv => inv.status === 'pending')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
                const totalClients = clientsData?.length || 0
                const completedProjects = projectsData?.filter(p => p.status === 'completed').length || 0

                // Calculate overdue invoices
                const today = new Date()
                const overdueInvoicesCount = invoicesData?.filter(inv =>
                    inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < today
                ).length || 0

                // Calculate average project value
                const totalProjectBudget = projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
                const avgProjectValue = projectsData && projectsData.length > 0 ? totalProjectBudget / projectsData.length : 0

                // Calculate service breakdown
                const serviceCounts = projectsData?.reduce((acc, project) => {
                    acc[project.service_type] = (acc[project.service_type] || 0) + 1
                    return acc
                }, {} as Record<ServiceType, number>) || {}

                const total = Object.values(serviceCounts).reduce((sum: number, count) => sum + (count as number), 0)
                const breakdown = Object.entries(serviceCounts).map(([service, count]) => ({
                    service_type: service as ServiceType,
                    count: count as number,
                    percentage: (total as number) > 0 ? ((count as number) / (total as number)) * 100 : 0,
                }))

                setServiceBreakdown(breakdown)

                setStats({
                    totalRevenue,
                    activeProjects,
                    pendingInvoices,
                    totalClients,
                    overdueInvoices: overdueInvoicesCount,
                    completedProjects,
                    avgProjectValue,
                })

                // Fetch pending project proposals
                setProposalLoading(true)
                const { data: proposalData, error: proposalError } = await supabase
                    .from('employee_tasks')
                    .select('id, title, proposed_project_name, proposed_project_status, proposed_project_notes, user_id, created_at, projects(name), users:users!employee_tasks_user_id_fkey(full_name, email)')
                    .not('proposed_project_name', 'is', null)
                    .eq('proposed_project_status', 'pending')
                    .order('created_at', { ascending: false })

                if (!proposalError) {
                    setProposals(proposalData || [])
                }
                setProposalLoading(false)

                // Fetch pending users awaiting approval
                setPendingUsersLoading(true)
                const { data: pendingUsersData, error: pendingUsersError } = await supabase
                    .from('users')
                    .select('id, email, full_name, role, company_name, created_at, status')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: true })

                if (!pendingUsersError) {
                    setPendingUsers(pendingUsersData || [])
                }
                setPendingUsersLoading(false)
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
                setError('Something went wrong while loading your dashboard. Please refresh.')
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user?.id, authLoading])

    // Calculate total project amount based on time period
    const filterByTimePeriod = (items: any[], dateField: string = 'created_at'): any[] => {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        return items.filter(item => {
            if (timePeriodFilter === 'all') return true

            const itemDate = item[dateField] ? new Date(item[dateField]) : null
            if (!itemDate) return false

            const itemStartOfDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())

            switch (timePeriodFilter) {
                case 'day':
                    return itemStartOfDay.getTime() === startOfToday.getTime()
                case 'week': {
                    const weekAgo = new Date(startOfToday)
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return itemStartOfDay >= weekAgo && itemStartOfDay <= startOfToday
                }
                case 'month': {
                    return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
                }
                case 'quarter': {
                    const quarter = Math.floor(now.getMonth() / 3)
                    const itemQuarter = Math.floor(itemDate.getMonth() / 3)
                    return itemQuarter === quarter && itemDate.getFullYear() === now.getFullYear()
                }
                case 'year':
                    return itemDate.getFullYear() === now.getFullYear()
                default:
                    return true
            }
        })
    }

    // Get filtered stats based on time period
    const getFilteredStats = () => {
        const filteredProjects = filterByTimePeriod(projects)
        const filteredInvoices = filterByTimePeriod(invoices)

        const totalRevenue = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
        const activeProjects = filteredProjects.filter(p => p.status === 'in_progress').length || 0
        const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
        const completedProjects = filteredProjects.filter(p => p.status === 'completed').length || 0

        const today = new Date()
        const overdueInvoicesCount = filteredInvoices.filter(inv =>
            inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < today
        ).length || 0

        const totalProjectBudget = filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
        const avgProjectValue = filteredProjects.length > 0 ? totalProjectBudget / filteredProjects.length : 0

        return {
            totalRevenue,
            activeProjects,
            pendingInvoices,
            totalClients: clients.length, // Client count doesn't filter by date
            overdueInvoices: overdueInvoicesCount,
            completedProjects,
            avgProjectValue,
        }
    }

    const getTotalProjectAmount = (): number => {
        return filterByTimePeriod(projects).reduce((sum, project) => sum + (project.budget || 0), 0)
    }

    const filteredStats = getFilteredStats()

    const handleUserApproval = async (userId: string, decision: 'approved' | 'rejected') => {
        setPendingActionUserId(userId)
        const result = await approveUserAccount({ userId, decision })

        if (!result.success) {
            console.error('Failed to update user status', result.error)
            setError(result.error || 'Could not update user status. Please retry.')
        } else {
            setPendingUsers(prev => prev.filter(user => user.id !== userId))
        }

        setPendingActionUserId(null)
    }

    const handleProposalDecision = async (taskId: string, decision: 'approved' | 'rejected') => {
        setProposalSubmitting(true)
        const selectedProject = proposalSelections[taskId]
        const projectId = selectedProject && selectedProject !== 'none' ? selectedProject : undefined
        const result = await reviewProjectProposal({ taskId, decision, projectId })
        if (result.error) {
            alert(result.error)
        } else {
            // refresh proposals list
            const supabase = createClient()
            const { data: proposalData } = await supabase
                .from('employee_tasks')
                .select('id, title, proposed_project_name, proposed_project_status, proposed_project_notes, user_id, created_at, projects(name), users:users!employee_tasks_user_id_fkey(full_name, email)')
                .not('proposed_project_name', 'is', null)
                .eq('proposed_project_status', 'pending')
                .order('created_at', { ascending: false })
            setProposals(proposalData || [])
        }
        setProposalSubmitting(false)
    }

    const handleConfirmAndApproveByEmail = async () => {
        if (!bannerEmail) return
        setBannerProcessing(true)
        try {
            const supabase = createClient()
            const confirm = await forceConfirmEmail(bannerEmail)
            if (!confirm.success) {
                setError(confirm.error || 'Failed to confirm email')
                setBannerProcessing(false)
                return
            }
            const { data: userRow } = await supabase
                .from('users')
                .select('id, email, status')
                .eq('email', bannerEmail)
                .limit(1)
                .single()
            if (!userRow?.id) {
                setError('User not found in users table')
                setBannerProcessing(false)
                return
            }
            const result = await approveUserAccount({ userId: userRow.id, decision: 'approved' })
            if (!result.success) {
                setError(result.error || 'Failed to approve user')
                setBannerProcessing(false)
                return
            }
            setPendingUsers(prev => prev.filter(u => u.email !== bannerEmail))
            setBannerEmail('')
            setError(null)
        } catch (e: any) {
            setError(e?.message || 'Unexpected error while confirming & approving')
        } finally {
            setBannerProcessing(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="max-w-lg w-full">
                    <CardHeader>
                        <CardTitle>Dashboard unavailable</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button onClick={() => router.refresh()}>Retry</Button>
                        <Button variant="outline" onClick={() => window.location.reload()}>Hard reload</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const recentProjects = projects.slice(0, 5)
    const recentInvoices = invoices.slice(0, 5)
    const recentClients = clients.slice(0, 5)

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

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1
                        className="text-2xl md:text-3xl font-bold tracking-tight select-none"
                        onDoubleClick={() => setDevToolsOpen(true)}
                        title=""
                    >
                        Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1">
                        Welcome back! Here&apos;s an overview of your business.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => router.push('/dashboard/projects')} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/clients')} className="w-full sm:w-auto">
                        <Users className="h-4 w-4 mr-2" />
                        Add Client
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/dashboard/invoices')} className="w-full sm:w-auto">
                        <FileText className="h-4 w-4 mr-2" />
                        Create Invoice
                    </Button>
                </div>
            </div>

            {/* Hidden Admin Tools Dialog (double-click the Dashboard title) */}
            <Dialog open={devToolsOpen} onOpenChange={setDevToolsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admin Tools</DialogTitle>
                        <DialogDescription>Grant admin or confirm email for a user</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <label htmlFor="grant-admin-email" className="text-sm">Grant Admin by Email</label>
                            <Input
                                id="grant-admin-email"
                                value={grantAdminEmail}
                                onChange={(e) => setGrantAdminEmail(e.target.value)}
                                placeholder="user@example.com"
                                type="email"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                disabled={grantingAdmin || !grantAdminEmail}
                                onClick={async () => {
                                    setGrantingAdmin(true)
                                    const res = await grantAdminByEmail(grantAdminEmail)
                                    if (!res.success) {
                                        setError(res.error || 'Failed to grant admin')
                                    } else {
                                        setError(null)
                                        setGrantAdminEmail('')
                                    }
                                    setGrantingAdmin(false)
                                }}
                            >
                                {grantingAdmin ? 'Granting…' : 'Grant Admin'}
                            </Button>
                        </div>
                        <div className="space-y-2 pt-3 border-t">
                            <label htmlFor="confirm-email" className="text-sm">Force Confirm Email</label>
                            <Input
                                id="confirm-email"
                                value={confirmEmailInput}
                                onChange={(e) => setConfirmEmailInput(e.target.value)}
                                placeholder="client@example.com"
                                type="email"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                disabled={confirmingEmail || !confirmEmailInput}
                                onClick={async () => {
                                    setConfirmingEmail(true)
                                    const res = await forceConfirmEmail(confirmEmailInput)
                                    if (!res.success) {
                                        setError(res.error || 'Failed to confirm email')
                                    } else {
                                        setError(null)
                                        setConfirmEmailInput('')
                                    }
                                    setConfirmingEmail(false)
                                }}
                            >
                                {confirmingEmail ? 'Confirming…' : 'Confirm Email'}
                            </Button>
                            <Button variant="outline" onClick={() => setDevToolsOpen(false)}>Close</Button>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Hint: double-click the “Dashboard” title to open this.</p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Time Period Filter */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { label: 'Day', value: 'day' },
                    { label: 'Week', value: 'week' },
                    { label: 'Month', value: 'month' },
                    { label: 'Quarter', value: 'quarter' },
                    { label: 'Year', value: 'year' },
                    { label: 'All', value: 'all' }
                ].map(period => (
                    <Button
                        key={period.value}
                        variant={timePeriodFilter === period.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimePeriodFilter(period.value)}
                    >
                        {period.label}
                    </Button>
                ))}
            </div>

            {/* Email Confirmation Banner */}
            <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-sm md:text-base">Unconfirmed accounts</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                        Some legacy signups may still require email confirmation. Quickly confirm and approve a client by email.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-2">
                    <Input
                        placeholder="client@example.com"
                        type="email"
                        value={bannerEmail}
                        onChange={(e) => setBannerEmail(e.target.value)}
                        className="sm:max-w-xs"
                    />
                    <Button
                        onClick={handleConfirmAndApproveByEmail}
                        disabled={bannerProcessing || !bannerEmail}
                    >
                        {bannerProcessing ? 'Processing…' : 'Confirm + Approve'}
                    </Button>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max">
                <StatCard
                    title="Total Revenue"
                    value={`₹${filteredStats.totalRevenue.toLocaleString()}`}
                    change="From paid invoices"
                    trend="up"
                    icon={DollarSign}
                />
                <StatCard
                    title="Active Projects"
                    value={filteredStats.activeProjects.toString()}
                    change={`${filteredStats.completedProjects} completed`}
                    trend="up"
                    icon={FolderKanban}
                />
                <StatCard
                    title="Total Clients"
                    value={filteredStats.totalClients.toString()}
                    change="Client relationships"
                    trend="up"
                    icon={Users}
                />
                <Card className="p-6 sm:row-span-2 lg:col-span-1">
                    <div className="space-y-2 h-full flex flex-col justify-center">
                        <p className="text-sm font-medium text-muted-foreground">Total Project Amount</p>
                        <p className="text-3xl font-bold">₹{Math.round(getTotalProjectAmount() / 1000)}k</p>
                        <p className="text-xs text-muted-foreground">
                            {timePeriodFilter === 'all' ? 'All time' : `This ${timePeriodFilter}`}
                        </p>
                    </div>
                </Card>
                <StatCard
                    title="Pending Invoices"
                    value={`₹${filteredStats.pendingInvoices.toLocaleString()}`}
                    change={`${filteredStats.overdueInvoices} overdue`}
                    trend={filteredStats.overdueInvoices > 0 ? "down" : "neutral"}
                    icon={Receipt}
                />
                <StatCard
                    title="Avg Project Value"
                    value={`₹${Math.round(filteredStats.avgProjectValue).toLocaleString()}`}
                    change="Per project"
                    trend="up"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Completion Rate"
                    value={`${filterByTimePeriod(projects).length > 0 ? Math.round((filteredStats.completedProjects / filterByTimePeriod(projects).length) * 100) : 0}%`}
                    change={`${filteredStats.completedProjects}/${filterByTimePeriod(projects).length} projects`}
                    trend="up"
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Pending Approvals"
                    value={pendingUsers.length.toString()}
                    change="Awaiting admin review"
                    trend="neutral"
                    icon={Bell}
                />
            </div>

            {/* Pending Account Approvals */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg md:text-xl">Account Approvals</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Approve or reject newly registered users</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {pendingUsers.length} pending
                        </Badge>
                        {pendingUsersLoading && <Badge variant="secondary">Loading...</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {pendingUsersLoading ? (
                        <p className="text-sm text-muted-foreground">Loading pending users...</p>
                    ) : pendingUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending accounts right now.</p>
                    ) : (
                        pendingUsers.map((pendingUser) => (
                            <div key={pendingUser.id} className="p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="font-semibold">{pendingUser.full_name || pendingUser.email}</p>
                                    <p className="text-xs text-muted-foreground">{pendingUser.email}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="secondary">{pendingUser.role}</Badge>
                                        {pendingUser.company_name && <span>{pendingUser.company_name}</span>}
                                        {pendingUser.created_at && <span>Joined {new Date(pendingUser.created_at).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        disabled={pendingActionUserId === pendingUser.id}
                                        onClick={() => handleUserApproval(pendingUser.id, 'approved')}
                                    >
                                        Approve
                                    </Button>
                                    {pendingUser.role === 'client' && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={pendingActionUserId === pendingUser.id}
                                            onClick={async () => {
                                                setPendingActionUserId(pendingUser.id)
                                                const res = await forceConfirmEmail(pendingUser.email)
                                                if (!res.success) {
                                                    setError(res.error || 'Failed to confirm email')
                                                } else {
                                                    setError(null)
                                                }
                                                setPendingActionUserId(null)
                                            }}
                                        >
                                            Confirm Email
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={pendingActionUserId === pendingUser.id}
                                        onClick={() => handleUserApproval(pendingUser.id, 'rejected')}
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Pending Project Proposals */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg md:text-xl">Project Proposals from Employees</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Approve or reject tasks that propose new projects</CardDescription>
                    </div>
                    {proposalLoading && <Badge variant="outline">Loading...</Badge>}
                </CardHeader>
                <CardContent>
                    {proposals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending proposals right now.</p>
                    ) : (
                        <div className="space-y-3">
                            {proposals.map((proposal) => (
                                <div key={proposal.id} className="p-3 border rounded-lg space-y-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold">{proposal.proposed_project_name}</p>
                                                {proposal.proposed_project_vertical && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {proposal.proposed_project_vertical === 'video_production' && '🎬 Video Production'}
                                                        {proposal.proposed_project_vertical === 'social_media' && '📱 Social Media'}
                                                        {proposal.proposed_project_vertical === 'design_branding' && '🎨 Design & Branding'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">Task: {proposal.title}</p>
                                            {proposal.users?.full_name && (
                                                <p className="text-xs text-muted-foreground">From: {proposal.users.full_name} ({proposal.users.email})</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">Created {new Date(proposal.created_at).toLocaleString()}</p>
                                            {proposal.projects?.name && (
                                                <p className="text-xs text-muted-foreground">Currently mapped: {proposal.projects.name}</p>
                                            )}
                                        </div>
                                        <div className="w-48">
                                            <Select
                                                value={proposalSelections[proposal.id] || 'none'}
                                                onValueChange={(value) => setProposalSelections({ ...proposalSelections, [proposal.id]: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Attach to project (optional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No project yet</SelectItem>
                                                    {projects.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            disabled={proposalSubmitting}
                                            onClick={() => handleProposalDecision(proposal.id, 'approved')}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={proposalSubmitting}
                                            onClick={() => handleProposalDecision(proposal.id, 'rejected')}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Service Breakdown */}
            {projects.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg md:text-xl">Service Breakdown</CardTitle>
                            <CardDescription className="text-xs md:text-sm">Projects by service vertical</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/analytics')} className="w-full sm:w-auto">
                            View Analytics
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="video_production" className="w-full">
                            <TabsList className="flex flex-wrap">
                                <TabsTrigger value="video_production">Video Production</TabsTrigger>
                                <TabsTrigger value="social_media">Social Media</TabsTrigger>
                                <TabsTrigger value="design_branding">Design & Branding</TabsTrigger>
                            </TabsList>

                            {/* Video Production */}
                            <TabsContent value="video_production">
                                <div className="space-y-3">
                                    {projects.filter(p => p.service_type === 'video_production').length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No video production projects yet</p>
                                    ) : (
                                        projects
                                            .filter(p => p.service_type === 'video_production')
                                            .map((project) => (
                                                <div
                                                    key={project.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                                    onClick={() => setSelectedProject(project)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">{project.name}</p>
                                                        <p className="text-sm text-muted-foreground">{project.clients?.company_name || 'No client'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {project.budget && (
                                                            <span className="text-sm font-medium">₹{project.budget.toLocaleString()}</span>
                                                        )}
                                                        <StatusBadge status={project.status} />
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </TabsContent>

                            {/* Social Media */}
                            <TabsContent value="social_media">
                                <div className="space-y-3">
                                    {projects.filter(p => p.service_type === 'social_media').length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No social media projects yet</p>
                                    ) : (
                                        projects
                                            .filter(p => p.service_type === 'social_media')
                                            .map((project) => (
                                                <div
                                                    key={project.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                                    onClick={() => setSelectedProject(project)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">{project.name}</p>
                                                        <p className="text-sm text-muted-foreground">{project.clients?.company_name || 'No client'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {project.budget && (
                                                            <span className="text-sm font-medium">₹{project.budget.toLocaleString()}</span>
                                                        )}
                                                        <StatusBadge status={project.status} />
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </TabsContent>

                            {/* Design & Branding */}
                            <TabsContent value="design_branding">
                                <div className="space-y-3">
                                    {projects.filter(p => p.service_type === 'design_branding').length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No design & branding projects yet</p>
                                    ) : (
                                        projects
                                            .filter(p => p.service_type === 'design_branding')
                                            .map((project) => (
                                                <div
                                                    key={project.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                                    onClick={() => setSelectedProject(project)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">{project.name}</p>
                                                        <p className="text-sm text-muted-foreground">{project.clients?.company_name || 'No client'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {project.budget && (
                                                            <span className="text-sm font-medium">₹{project.budget.toLocaleString()}</span>
                                                        )}
                                                        <StatusBadge status={project.status} />
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )
            }

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Recent Clients */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg md:text-xl">Recent Clients</CardTitle>
                            <CardDescription className="text-xs md:text-sm">Latest client additions</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recentClients.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">No clients yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentClients.map((client) => {
                                    const clientProjects = projects.filter(p => p.client_id === client.id)
                                    const clientServices = [...new Set(clientProjects.map(p => p.service_type))]

                                    return (
                                        <div
                                            key={client.id}
                                            className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium">{client.company_name}</p>
                                                    <p className="text-sm text-muted-foreground">{client.contact_person}</p>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {clientProjects.length} {clientProjects.length === 1 ? 'project' : 'projects'}
                                                </Badge>
                                            </div>
                                            {clientServices.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                    {clientServices.map(service => {
                                                        const config = SERVICE_TYPES[service as ServiceType]
                                                        return (
                                                            <Badge key={service} variant="outline" className="text-xs">
                                                                {config.icon} {config.label}
                                                            </Badge>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Invoices */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg md:text-xl">Recent Invoices</CardTitle>
                            <CardDescription className="text-xs md:text-sm">Latest billing activity</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/invoices')} className="w-full sm:w-auto">
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentInvoices.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">No invoices yet</p>
                                <Button onClick={() => router.push('/dashboard/invoices')} className="mt-4" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Invoice
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/invoices`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{invoice.invoice_number}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {invoice.clients?.company_name || 'No client'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-medium">₹{invoice.total?.toLocaleString()}</span>
                                            <StatusBadge status={invoice.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Overdue Invoices Alert */}
            {
                stats.overdueInvoices > 0 && (() => {
                    const overdueInvoices = invoices.filter(inv =>
                        inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date()
                    )
                    return (
                        <Card className="border-red-500/50 bg-red-500/5">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <CardTitle className="text-red-500">Overdue Invoices</CardTitle>
                                </div>
                                <CardDescription>These invoices are past their due date</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {overdueInvoices.slice(0, 5).map((invoice) => {
                                        const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.due_date!).getTime()) / (1000 * 60 * 60 * 24))
                                        return (
                                            <div
                                                key={invoice.id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-background cursor-pointer hover:bg-accent transition-colors"
                                                onClick={() => router.push(`/dashboard/invoices`)}
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium">{invoice.invoice_number}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {invoice.clients?.company_name || 'No client'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-sm font-medium">₹{invoice.total?.toLocaleString()}</span>
                                                    <Badge variant="destructive" className="text-xs">
                                                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                                    </Badge>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                {overdueInvoices.length > 5 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-4"
                                        onClick={() => router.push('/dashboard/invoices')}
                                    >
                                        View all {overdueInvoices.length} overdue invoices
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )
                })()
            }

            {/* Upcoming Milestones */}
            {
                milestones.length > 0 && (
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
                                            <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{milestone.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {milestone.projects?.name || 'No project'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
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
                )
            }

            {/* Project Details Dialog */}
            <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
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
                                            <span className="mr-1">{SERVICE_TYPES[selectedProject.service_type]?.icon}</span>
                                            {SERVICE_TYPES[selectedProject.service_type]?.label || selectedProject.service_type}
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
                                                    <Calendar className="h-3 w-3" />
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
                                                <Progress value={selectedProject.progress_percentage || 0} className="h-2 flex-1" />
                                                <span className="font-semibold text-sm">{selectedProject.progress_percentage || 0}%</span>
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

                                {/* Action Button */}
                                <Button
                                    onClick={() => {
                                        router.push(`/dashboard/projects?id=${selectedProject.id}`)
                                        setSelectedProject(null)
                                    }}
                                    className="w-full"
                                >
                                    View Full Details
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    )
}
