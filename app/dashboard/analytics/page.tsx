"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, DollarSign, FolderKanban, Users, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SERVICE_TYPES, type ServiceType, type Project, type Invoice, type Client } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts"

interface ServiceStats {
    service_type: ServiceType
    project_count: number
    total_revenue: number
    active_projects: number
    avg_project_value: number
}

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [projects, setProjects] = useState<Project[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [serviceStats, setServiceStats] = useState<ServiceStats[]>([])

    useEffect(() => {
        fetchAnalytics()
    }, [])

    async function fetchAnalytics() {
        const supabase = createClient()
        setLoading(true)

        try {
            // Fetch all data
            const [projectsRes, invoicesRes, clientsRes] = await Promise.all([
                supabase.from('projects').select('*'),
                supabase.from('invoices').select('*'),
                supabase.from('clients').select('*'),
            ])

            const projectsData = projectsRes.data || []
            const invoicesData = invoicesRes.data || []
            const clientsData = clientsRes.data || []

            setProjects(projectsData)
            setInvoices(invoicesData)
            setClients(clientsData)

            // Calculate service-wise statistics
            const stats: ServiceStats[] = ['video_production', 'social_media', 'design_branding'].map((service) => {
                const serviceProjects = projectsData.filter(p => p.service_type === service)
                const serviceProjectIds = serviceProjects.map(p => p.id)
                const serviceInvoices = invoicesData.filter(inv =>
                    serviceProjectIds.includes(inv.project_id) && inv.status === 'paid'
                )
                const totalRevenue = serviceInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
                const activeProjects = serviceProjects.filter(p =>
                    p.status === 'in_progress' || p.status === 'planning'
                ).length

                return {
                    service_type: service as ServiceType,
                    project_count: serviceProjects.length,
                    total_revenue: totalRevenue,
                    active_projects: activeProjects,
                    avg_project_value: serviceProjects.length > 0 ? totalRevenue / serviceProjects.length : 0,
                }
            })

            setServiceStats(stats)
        } catch (error) {
            console.error('Error fetching analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length
    const totalClients = clients.length

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">
                    View insights and performance metrics across all services
                </p>
            </div>

            {/* Overall Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">From paid invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProjects}</div>
                        <p className="text-xs text-muted-foreground">{activeProjects} active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClients}</div>
                        <p className="text-xs text-muted-foreground">Total clients</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Project Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{totalProjects > 0 ? Math.round(totalRevenue / totalProjects).toLocaleString() : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Per project</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue by Service - Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Service</CardTitle>
                        <CardDescription>Revenue distribution across services</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {serviceStats.some(s => s.total_revenue > 0) ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={serviceStats.map(s => ({
                                        name: SERVICE_TYPES[s.service_type].label,
                                        revenue: s.total_revenue,
                                    }))}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-muted-foreground">
                                No revenue data yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Projects by Service - Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Projects by Service</CardTitle>
                        <CardDescription>Project count distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {serviceStats.some(s => s.project_count > 0) ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={serviceStats.map(s => ({
                                            name: SERVICE_TYPES[s.service_type].label,
                                            value: s.project_count,
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent = 0 }: { name: string; percent?: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        <Cell fill="#3b82f6" />
                                        <Cell fill="#10b981" />
                                        <Cell fill="#f59e0b" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-muted-foreground">
                                No project data yet
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Active Projects vs Completed - Bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Project Status Distribution</CardTitle>
                    <CardDescription>Active vs completed projects by service</CardDescription>
                </CardHeader>
                <CardContent>
                    {serviceStats.some(s => s.active_projects > 0 || s.project_count > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={serviceStats.map(s => ({
                                    name: SERVICE_TYPES[s.service_type].label,
                                    active: s.active_projects,
                                    completed: s.project_count - s.active_projects,
                                }))}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="active" fill="#3b82f6" name="Active Projects" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="completed" fill="#10b981" name="Completed Projects" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                            No project data yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Service Breakdown Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Service Breakdown</CardTitle>
                    <CardDescription>Detailed performance metrics by service vertical</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {serviceStats.map((stat) => {
                            const serviceConfig = SERVICE_TYPES[stat.service_type]
                            const revenuePercent = totalRevenue > 0 ? (stat.total_revenue / totalRevenue) * 100 : 0

                            return (
                                <div key={stat.service_type} className="space-y-3 border-b last:border-b-0 pb-6 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">{serviceConfig.icon}</div>
                                            <div>
                                                <h3 className="font-semibold">{serviceConfig.label}</h3>
                                                <p className="text-sm text-muted-foreground">{serviceConfig.description}</p>
                                            </div>
                                        </div>
                                        <Badge className={serviceConfig.bgColor + ' ' + serviceConfig.textColor}>
                                            {stat.project_count} projects
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">Revenue</div>
                                            <div className="font-semibold text-lg">₹{stat.total_revenue.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Active Projects</div>
                                            <div className="font-semibold text-lg">{stat.active_projects}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Avg Value</div>
                                            <div className="font-semibold text-lg">₹{Math.round(stat.avg_project_value).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Revenue Share</div>
                                            <div className="font-semibold text-lg">{revenuePercent.toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Revenue contribution</span>
                                            <span>{revenuePercent.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={revenuePercent} className="h-2" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {serviceStats.every(s => s.project_count === 0) && (
                        <div className="text-center py-12">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
                            <p className="text-sm text-muted-foreground">
                                Start creating projects to see service analytics
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
