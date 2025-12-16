"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  BarChart3,
  Settings,
  UserCheck
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const adminRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    href: "/dashboard/projects",
  },
  {
    label: "All Clients",
    icon: Users,
    href: "/dashboard/clients",
  },
  {
    label: "Team Members",
    icon: UserCheck,
    href: "/dashboard/team",
  },
  {
    label: "Invoices",
    icon: FileText,
    href: "/dashboard/invoices",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

const employeeRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard/employee",
  },
  {
    label: "My Projects",
    icon: FolderKanban,
    href: "/dashboard/projects",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

const clientRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard/client",
  },
  {
    label: "My Projects",
    icon: FolderKanban,
    href: "/dashboard/client/projects",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  // Determine routes based on user role
  let routes = adminRoutes
  if (user?.role === 'client') {
    routes = clientRoutes
  } else if (user?.role === 'project_manager') {
    routes = employeeRoutes
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">VP</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Welcome</span>
            <span className="text-lg font-bold leading-tight line-clamp-2">
              {user?.company_name || user?.full_name || "Video Production"}
            </span>
          </div>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === route.href && "bg-muted text-primary"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
