"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderKanban, Download, FileText, Plus, Eye, Filter, CalendarClock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/shared/status-badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export default function ClientDashboard() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [projects, setProjects] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [files, setFiles] = useState<any[]>([])
    const [clientData, setClientData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
    const [stats, setStats] = useState({
        activeProjects: 0,
        completedProjects: 0,
        pendingInvoices: 0,
        totalSpent: 0,
    })

    const filteredProjects = useMemo(() => {
        if (statusFilter === 'all') return projects
        return projects.filter((p) => p.status === statusFilter)
    }, [projects, statusFilter])

    const filteredInvoices = useMemo(() => {
        if (invoiceFilter === 'all') return invoices
        return invoices.filter((inv) => inv.status === invoiceFilter)
    }, [invoices, invoiceFilter])

    const nextDueInvoice = useMemo(() => {
        return [...invoices]
            .filter((inv) => inv.status !== 'paid' && inv.due_date)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
    }, [invoices])

    const lastDelivery = useMemo(() => {
        return [...files].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    }, [files])

    useEffect(() => {
        async function fetchClientData() {
            if (!user || authLoading) return

            const supabase = createClient()

            try {
                // Get client record
                const { data: clientRecord, error: clientError } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('user_id', user.id)
                    .single()

                if (clientError) throw clientError
                setClientData(clientRecord)

                // Fetch projects for this client
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('client_id', clientRecord.id)
                    .order('created_at', { ascending: false })

                if (projectsError) throw projectsError

                // Fetch invoices for this client
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('client_id', clientRecord.id)
                    .order('created_at', { ascending: false })

                if (invoicesError) throw invoicesError

                // Fetch recent files for client's projects
                const projectIds = projectsData?.map(p => p.id) || []
                const { data: filesData, error: filesError } = await supabase
                    .from('project_files')
                    .select('*, projects(name)')
                    .in('project_id', projectIds)
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (filesError) throw filesError

                setProjects(projectsData || [])
                setInvoices(invoicesData || [])
                setFiles(filesData || [])

                // Calculate stats
                const activeCount = projectsData?.filter(p => p.status === 'in_progress' || p.status === 'in_review')?.length || 0
                const completedCount = projectsData?.filter(p => p.status === 'completed')?.length || 0
                const pendingInvoicesCount = invoicesData?.filter(inv => inv.status === 'sent' || inv.status === 'overdue')?.length || 0
                const totalSpent = invoicesData?.filter(inv => inv.status === 'paid')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

                setStats({
                    activeProjects: activeCount,
                    completedProjects: completedCount,
                    pendingInvoices: pendingInvoicesCount,
                    totalSpent,
                })
            } catch (error) {
                console.error('Error fetching client data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchClientData()
    }, [user?.id, authLoading])

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    const statsCards = [
        {
            title: "Active Projects",
            value: stats.activeProjects.toString(),
            change: `${stats.completedProjects} completed`,
            trend: "neutral" as const,
            icon: FolderKanban,
        },
        {
            title: "Total Spent",
            value: `₹${stats.totalSpent.toLocaleString()}`,
            change: "Paid invoices",
            trend: "neutral" as const,
            icon: FileText,
        },
        {
            title: "Pending Invoices",
            value: stats.pendingInvoices.toString(),
            change: "Awaiting payment",
            trend: stats.pendingInvoices > 0 ? "down" as const : "neutral" as const,
            icon: FileText,
        },
        {
            title: "Latest Files",
            value: files.length.toString(),
            change: "Available downloads",
            trend: "up" as const,
            icon: Download,
        },
        {
            title: "Next Due Invoice",
            value: nextDueInvoice ? `₹${(nextDueInvoice.total || 0).toLocaleString()}` : 'None',
            change: nextDueInvoice ? `Due ${new Date(nextDueInvoice.due_date).toLocaleDateString()}` : 'All paid',
            trend: nextDueInvoice ? 'down' as const : 'up' as const,
            icon: CalendarClock,
        },
        {
            title: "Last Delivery",
            value: lastDelivery ? (lastDelivery.file_name || 'File') : 'No files',
            change: lastDelivery ? `From ${lastDelivery.projects?.name || 'Project'}` : 'Waiting for first upload',
            trend: lastDelivery ? 'up' as const : 'neutral' as const,
            icon: Download,
        },
    ]

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome, {clientData?.company_name}</h1>
                    <p className="text-muted-foreground">Track your projects and download deliverables</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setStatusFilter(statusFilter === 'all' ? 'in_progress' : 'all')}>
                        <Filter className="h-4 w-4 mr-2" />
                        {statusFilter === 'all' ? 'Show Active' : 'Show All'}
                    </Button>
                    <Button onClick={() => router.push('/dashboard/client/request')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Request Project
                    </Button>
                </div>
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
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg md:text-xl">Your Projects</CardTitle>
                            <CardDescription className="text-xs md:text-sm">Track progress and view updates</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredProjects.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground mb-4">No projects match this filter</p>
                                <Button variant="outline" onClick={() => setStatusFilter('all')}>Reset Filter</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredProjects.slice(0, 3).map((project) => (
                                    <div key={project.id} className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                        onClick={() => router.push(`/dashboard/client/projects/${project.id}`)}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <p className="font-medium">{project.name}</p>
                                                {project.description && (
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                        {project.description}
                                                    </p>
                                                )}
                                            </div>
                                            <StatusBadge status={project.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1">
                                                <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden max-w-[200px]">
                                                    <div
                                                        className="h-full bg-primary transition-all"
                                                        style={{ width: `${project.progress_percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{project.progress_percentage}%</span>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/client/projects/${project.id}`)
                                            }}>
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Latest Files */}
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg md:text-xl">Latest Deliverables</CardTitle>
                            <CardDescription className="text-xs md:text-sm">Recent files from your projects</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {files.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No files yet</p>
                        ) : (
                            <div className="space-y-3">
                                {files.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{file.file_name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {file.projects?.name}
                                                </p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => {
                                            router.push(`/dashboard/client/projects/${file.project_id}`)
                                        }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Invoices */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg md:text-xl">Invoices</CardTitle>
                        <CardDescription className="text-xs md:text-sm">View and pay your invoices</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/client/invoices')}>
                        View All
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                            <SelectTrigger className="w-[170px]"><SelectValue placeholder="All invoices" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {filteredInvoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No invoices match this filter</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredInvoices.slice(0, 5).map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => router.push(`/dashboard/client/invoices/${invoice.id}`)}>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex-1">
                                            <p className="font-medium">{invoice.invoice_number}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Due: {new Date(invoice.due_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">₹{invoice.total?.toLocaleString()}</p>
                                            <StatusBadge status={invoice.status} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                        <Button size="sm" variant="outline" onClick={(e) => {
                                            e.stopPropagation()
                                            if (invoice.invoice_url) window.open(invoice.invoice_url, '_blank')
                                        }}>
                                            <Download className="h-4 w-4 mr-1" /> PDF
                                        </Button>
                                        {invoice.status !== 'paid' && (
                                            <Button size="sm" onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/dashboard/client/invoices/${invoice.id}/pay`)
                                            }}>
                                                Pay Now
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Project Request CTA */}
            {projects.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-lg">Need Another Project?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Submit a request and our team will get back to you
                                </p>
                            </div>
                            <Button onClick={() => router.push('/dashboard/client/request')}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Request
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
