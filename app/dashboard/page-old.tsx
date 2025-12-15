"use client"

import { useAuth } from "@/contexts/auth-context"
import AdminDashboard from "./admin-view"

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeProjects: 0,
    totalClients: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalPending: 0,
  })

  useEffect(() => {
    async function fetchAdminData() {
      if (!user || authLoading) return

      const supabase = createClient()

      try {
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        if (projectsError) throw projectsError

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')

        if (clientsError) throw clientsError

        // Fetch invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')

        if (invoicesError) throw invoicesError

        setProjects(projectsData || [])
        setClients(clientsData || [])
        setInvoices(invoicesData || [])

        // Calculate stats
        const totalRevenue = invoicesData?.filter(inv => inv.status === 'paid')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
        const activeProjectsCount = projectsData?.filter(p => p.status === 'in_progress')?.length || 0
        const pendingInvoicesCount = invoicesData?.filter(inv => inv.status === 'sent')?.length || 0
        const overdueInvoicesCount = invoicesData?.filter(inv => inv.status === 'overdue')?.length || 0
        const totalPending = invoicesData?.filter(inv => inv.status === 'sent' || inv.status === 'overdue')?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

        setStats({
          totalRevenue,
          activeProjects: activeProjectsCount,
          totalClients: clientsData?.length || 0,
          pendingInvoices: pendingInvoicesCount,
          overdueInvoices: overdueInvoicesCount,
          totalPending,
        })
      } catch (error) {
        console.error('Error fetching admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const statsCards = [
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: "+4.2%",
      trend: "up" as const,
      icon: DollarSign,
    },
    {
      title: "Active Projects",
      value: stats.activeProjects.toString(),
      change: "+2 this week",
      trend: "up" as const,
      icon: FolderKanban,
    },
    {
      title: "Total Clients",
      value: stats.totalClients.toString(),
      change: "+3 this month",
      trend: "up" as const,
      icon: Users,
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices.toString(),
      change: "Awaiting payment",
      trend: "neutral" as const,
      icon: FileText,
    },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Recent Projects */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently active projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No projects found</p>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {project.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium">
                          ${(project.budget || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Budget
                        </p>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <CardDescription>
              Latest clients added to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No clients found</p>
            ) : (
              <div className="space-y-4">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-start gap-3 md:gap-4"
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none">
                        {client.company_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {client.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added: {new Date(client.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you can perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            <button className="rounded-lg border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              New Project
            </button>
            <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Add Client
            </button>
            <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Create Invoice
            </button>
            <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Upload File
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
