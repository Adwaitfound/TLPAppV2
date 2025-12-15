"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, FolderKanban, FileText, Plus, Calendar } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import type { Project, Client, Invoice, Milestone } from "@/types"

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [loading, setLoading] = useState(true)

    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeProjects: 0,
        pendingInvoices: 0,
    })

    useEffect(() => {
        async function fetchDashboardData() {
            if (!user || authLoading) return

            const supabase = createClient()

            try {
                // Fetch projects
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .order('created_at', { ascending: false })

                if (projectsError) throw projectsError

                // Fetch invoices
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select('*, clients(company_name)')
                    .order('created_at', { ascending: false })

                if (invoicesError) throw invoicesError

                // Fetch upcoming milestones
                const { data: milestonesData, error: milestonesError } = await supabase
                    .from('milestones')
                    .select('*, projects(name)')
                    .in('status', ['pending', 'in_progress'])
                    .order('due_date', { ascending: true })
                    .limit(5)

                if (milestonesError) throw milestonesError

                setProjects(projectsData || [])
                setInvoices(invoicesData || [])
                setMilestones(milestonesData || [])

                // Calculate stats
                const totalRevenue = invoicesData?.filter(inv => inv.status === 'paid')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
                const activeProjects = projectsData?.filter(p => p.status === 'in_progress').length || 0
                const pendingInvoices = invoicesData?.filter(inv => inv.status === 'pending')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

                setStats({
                    totalRevenue,
                    activeProjects,
                    pendingInvoices,
                })
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user, authLoading])

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    const recentProjects = projects.slice(0, 5)
    const recentInvoices = invoices.slice(0, 5)

    return (
        <div className="flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back! Here&apos;s an overview of your business.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => router.push('/dashboard/projects')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    change="All time earnings"
                    trend="up"
                    icon={DollarSign}
                />
                <StatCard
                    title="Active Projects"
                    value={stats.activeProjects.toString()}
                    change={`${projects.length} total projects`}
                    trend="up"
                    icon={FolderKanban}
                />
                <StatCard
                    title="Pending Invoices"
                    value={`$${stats.pendingInvoices.toLocaleString()}`}
                    change="Awaiting payment"
                    trend="neutral"
                    icon={FileText}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Recent Projects */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Projects</CardTitle>
                            <CardDescription>Latest projects and their status</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentProjects.length === 0 ? (
                            <div className="text-center py-8">
                                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">No projects yet</p>
                                <Button onClick={() => router.push('/dashboard/projects')} className="mt-4" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Project
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/projects`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{project.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {project.clients?.company_name || 'No client'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {project.budget && (
                                                <span className="text-sm font-medium">${project.budget.toLocaleString()}</span>
                                            )}
                                            <StatusBadge status={project.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Invoices */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Invoices</CardTitle>
                            <CardDescription>Latest billing activity</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/invoices')}>
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
                                            <span className="text-sm font-medium">${invoice.total?.toLocaleString()}</span>
                                            <StatusBadge status={invoice.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

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
            )}
        </div>
    )
}
