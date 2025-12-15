"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Plus, Search, Calendar, DollarSign, User } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

// Mock data
const projects = [
  {
    id: "1",
    name: "Brand Video Production",
    client: "Tech Startup Inc.",
    status: "in_progress" as const,
    budget: 12500,
    progress_percentage: 65,
    start_date: "2024-12-01",
    deadline: "2025-01-15",
    description: "Complete brand video production for product launch",
  },
  {
    id: "2",
    name: "Product Launch Campaign",
    client: "E-commerce Co.",
    status: "in_review" as const,
    budget: 8900,
    progress_percentage: 90,
    start_date: "2024-11-15",
    deadline: "2025-01-10",
    description: "Multi-platform video campaign for new product",
  },
  {
    id: "3",
    name: "Corporate Training Videos",
    client: "Financial Services Ltd.",
    status: "planning" as const,
    budget: 15600,
    progress_percentage: 20,
    start_date: "2025-01-01",
    deadline: "2025-02-01",
    description: "Series of internal training videos",
  },
  {
    id: "4",
    name: "Social Media Content",
    client: "Retail Chain Inc.",
    status: "in_progress" as const,
    budget: 5200,
    progress_percentage: 45,
    start_date: "2024-12-10",
    deadline: "2025-01-20",
    description: "Monthly social media video content package",
  },
  {
    id: "5",
    name: "Event Coverage",
    client: "Media Agency",
    status: "completed" as const,
    budget: 7800,
    progress_percentage: 100,
    start_date: "2024-11-01",
    deadline: "2024-12-01",
    description: "Full event coverage and highlights video",
  },
]

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage all your video production projects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter the project details to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" placeholder="Brand Video Production" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <Select>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Tech Startup Inc.</SelectItem>
                    <SelectItem value="ecommerce">E-commerce Co.</SelectItem>
                    <SelectItem value="finance">Financial Services Ltd.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief project description" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input id="budget" type="number" placeholder="10000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" type="date" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
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
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {filteredProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <CardDescription className="text-sm flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {project.client}
                  </CardDescription>
                </div>
                <StatusBadge status={project.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress_percentage}%</span>
                </div>
                <Progress value={project.progress_percentage} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Budget</p>
                  <p className="font-medium">${project.budget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Deadline</p>
                  <p className="font-medium">
                    {new Date(project.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Track and manage all your video production projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden lg:table-cell">Progress</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="hidden xl:table-cell">Deadline</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground hidden lg:block">
                        {project.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress_percentage} className="h-2 w-20" />
                      <span className="text-sm text-muted-foreground">
                        {project.progress_percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>${project.budget.toLocaleString()}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {new Date(project.deadline).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={project.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
