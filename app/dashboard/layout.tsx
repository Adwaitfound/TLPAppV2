"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Check if this is a client or employee route - they have their own layouts
  const isClientRoute = pathname.startsWith('/dashboard/client')
  const isEmployeeRoute = pathname.startsWith('/dashboard/employee')

  // Client and employee routes have their own layouts, so just pass through children
  if (isClientRoute || isEmployeeRoute) {
    return <>{children}</>
  }

  // Admin routes use the sidebar + header layout
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
