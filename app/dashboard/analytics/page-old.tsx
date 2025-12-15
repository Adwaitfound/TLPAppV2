"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Users, FolderKanban, Clock } from "lucide-react"
import { StatCard } from "@/components/shared/stat-card"

// Mock data for charts
const revenueData = [
  { month: "Jan", revenue: 12500, projects: 8 },
  { month: "Feb", revenue: 15200, projects: 10 },
  { month: "Mar", revenue: 18700, projects: 12 },
  { month: "Apr", revenue: 22100, projects: 14 },
  { month: "May", revenue: 19800, projects: 11 },
  { month: "Jun", revenue: 25400, projects: 15 },
]

const projectStatusData = [
  { name: "Completed", value: 45, color: "#10b981" },
  { name: "In Progress", value: 23, color: "#3b82f6" },
  { name: "In Review", value: 12, color: "#f59e0b" },
  { name: "Planning", value: 8, color: "#6b7280" },
]

const clientActivityData = [
  { name: "Tech Startup Inc.", projects: 12, revenue: 45600 },
  { name: "E-commerce Co.", projects: 8, revenue: 32400 },
  { name: "Financial Services", projects: 10, revenue: 38200 },
  { name: "Retail Chain", projects: 6, revenue: 24800 },
  { name: "Media Agency", projects: 9, revenue: 35100 },
]

const stats = [
  {
    title: "Total Revenue",
    value: "$96,876",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    title: "Active Projects",
    value: "23",
    change: "+4 this month",
    trend: "up" as const,
    icon: FolderKanban,
  },
  {
    title: "Total Clients",
    value: "18",
    change: "+2 new clients",
    trend: "up" as const,
    icon: Users,
  },
  {
    title: "Avg. Project Time",
    value: "28 days",
    change: "-3 days",
    trend: "down" as const,
    icon: Clock,
  },
]

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View insights and performance metrics
          </p>
        </div>
        <Select defaultValue="6months">
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="3months">Last 3 months</SelectItem>
            <SelectItem value="6months">Last 6 months</SelectItem>
            <SelectItem value="1year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Monthly revenue for the last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Top Clients by Revenue</CardTitle>
                <CardDescription>Revenue contribution by client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientActivityData.slice(0, 5).map((client, index) => (
                    <div key={client.name} className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.projects} projects
                        </p>
                      </div>
                      <div className="text-sm font-medium">
                        ${client.revenue.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Projects Overview</CardTitle>
                <CardDescription>Number of projects per month</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="projects"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                      name="Projects"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Project Status</CardTitle>
                <CardDescription>Distribution of project statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {projectStatusData.map((status) => (
                    <div key={status.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm">{status.name}</span>
                      <span className="ml-auto text-sm font-medium">{status.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
