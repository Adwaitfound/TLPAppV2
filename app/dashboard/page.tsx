import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, FolderKanban, Users, FileText, Clock } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatRelativeTime } from "@/lib/utils"

// Mock data - will be replaced with Supabase data later
const stats = [
  {
    title: "Total Revenue",
    value: "$96,876.43",
    change: "+4.2%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    title: "Active Projects",
    value: "23",
    change: "+2 this week",
    trend: "up" as const,
    icon: FolderKanban,
  },
  {
    title: "Total Clients",
    value: "18",
    change: "+3 this month",
    trend: "up" as const,
    icon: Users,
  },
  {
    title: "Pending Invoices",
    value: "7",
    change: "$12,450",
    trend: "neutral" as const,
    icon: FileText,
  },
]

const recentProjects = [
  {
    id: "1",
    name: "Brand Video Production",
    client: "Tech Startup Inc.",
    status: "in_progress" as const,
    progress: 65,
    deadline: "2025-01-15",
  },
  {
    id: "2",
    name: "Product Launch Campaign",
    client: "E-commerce Co.",
    status: "in_review" as const,
    progress: 90,
    deadline: "2025-01-10",
  },
  {
    id: "3",
    name: "Corporate Training Videos",
    client: "Financial Services Ltd.",
    status: "planning" as const,
    progress: 20,
    deadline: "2025-02-01",
  },
]

const recentActivity = [
  {
    id: "1",
    action: "New project created",
    project: "Social Media Campaign",
    time: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    action: "Invoice paid",
    project: "Brand Video Production",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "3",
    action: "Project completed",
    project: "Marketing Materials",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: "4",
    action: "New client added",
    project: "Retail Chain Inc.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Projects */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently active projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {project.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {project.client}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{project.progress}%</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4"
                >
                  <div className="rounded-full bg-primary/10 p-2">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.project}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              New Project
            </button>
            <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              Add Client
            </button>
            <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              Create Invoice
            </button>
            <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              Upload File
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
