"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Zap, Video, CheckCircle, BarChart3, FileText, FolderKanban, UserCog, Briefcase, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showLoginOptions, setShowLoginOptions] = useState(false)

  const handleGetStarted = () => {
    setShowLoginOptions(true)
  }

  const handleRoleLogin = (role: 'admin' | 'employee' | 'client') => {
    setIsLoading(true)
    setShowLoginOptions(false)
    router.push(`/login?role=${role}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Video className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">VideoProduction</span>
          </Link>
          <Button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? "Loading..." : "Get Started"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                  Professional Video Production Management
                </div>
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none">
                  Streamline Your{" "}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Video Production
                  </span>
                </h1>
                <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
                  Manage projects, collaborate with clients, track progress, and handle invoicing
                  all in one beautiful platform.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="gap-2 text-lg px-8"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8"
                  onClick={handleGetStarted}
                >
                  Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                Everything You Need
              </h2>
              <p className="text-muted-foreground text-lg max-w-[700px] mx-auto">
                Powerful features designed for video production professionals
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center space-y-4 text-center p-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <FolderKanban className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Project Management</h3>
                  <p className="text-muted-foreground">
                    Track all your video projects from planning to completion with intuitive dashboards and progress tracking.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center space-y-4 text-center p-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Client Collaboration</h3>
                  <p className="text-muted-foreground">
                    Share files, collect feedback, and communicate seamlessly with clients in real-time.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center space-y-4 text-center p-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Invoicing & Billing</h3>
                  <p className="text-muted-foreground">
                    Create professional invoices, track payments, and manage your finances effortlessly.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center space-y-4 text-center p-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Analytics & Reports</h3>
                  <p className="text-muted-foreground">
                    Gain insights into your business with comprehensive analytics and visual reports.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center space-y-4 text-center p-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Milestone Tracking</h3>
                  <p className="text-muted-foreground">
                    Set and track project milestones to keep everyone aligned and on schedule.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="flex flex-col items-center space-y-4 text-center p-6">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Automated Workflows</h3>
                  <p className="text-muted-foreground">
                    Automate repetitive tasks and focus on what matters - creating amazing content.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="flex flex-col items-center space-y-6 text-center p-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Get Started?
                </h2>
                <p className="text-muted-foreground text-lg max-w-[600px]">
                  Join thousands of video professionals who trust our platform to manage their projects.
                </p>
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="gap-2 text-lg px-8"
                >
                  {isLoading ? "Loading..." : "Start Free Trial"}
                  {!isLoading && <ArrowRight className="h-5 w-5" />}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Login Options Dialog */}
      <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Your Login Type</DialogTitle>
            <DialogDescription>
              Select your role to access the appropriate dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Card
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => handleRoleLogin('admin')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Admin</h3>
                  <p className="text-sm text-muted-foreground">
                    Full system access and management
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => handleRoleLogin('employee')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <Briefcase className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Employee</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage projects and tasks
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => handleRoleLogin('client')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-green-500/10 p-3">
                  <Building2 className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Client</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your projects and collaborate
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="w-full border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 VideoProduction App. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
