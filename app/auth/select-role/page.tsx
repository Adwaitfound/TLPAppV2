"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Briefcase, Shield, ArrowRight, LogIn } from "lucide-react"
import Link from "next/link"

export default function SelectRolePage() {
    const router = useRouter()

    const roles = [
        {
            type: "client",
            title: "Client",
            description: "Access your projects, view progress, and communicate with your team",
            icon: Users,
            color: "from-blue-500 to-cyan-500",
            signupRoute: "/signup?role=client",
        },
        {
            type: "employee",
            title: "Employee",
            description: "Manage assigned projects, track time, and collaborate with team members",
            icon: Briefcase,
            color: "from-purple-500 to-pink-500",
            signupRoute: "/signup?role=employee",
        },
        {
            type: "admin",
            title: "Admin",
            description: "Full access to manage projects, clients, employees, and analytics",
            icon: Shield,
            color: "from-orange-500 to-red-500",
            signupRoute: "/signup?role=admin",
        },
    ]

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
            <div className="w-full max-w-5xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        Welcome to VideoProduction
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Select your role to get started
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {roles.map((role) => {
                        const Icon = role.icon
                        return (
                            <Card
                                key={role.type}
                                className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg group"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                                <CardHeader className="text-center pb-4">
                                    <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit group-hover:scale-110 transition-transform">
                                        <Icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">{role.title}</CardTitle>
                                    <CardDescription className="text-base pt-2">
                                        {role.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center pb-6">
                                    <Button
                                        className="gap-2 group-hover:gap-3 transition-all w-full"
                                        onClick={() => router.push(role.signupRoute)}
                                    >
                                        Sign Up as {role.title}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span>Already have an account?</span>
                        <Link href="/login">
                            <Button variant="link" className="h-auto p-0 text-primary">
                                <LogIn className="h-4 w-4 mr-1" />
                                Sign In
                            </Button>
                        </Link>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ← Back to Home
                    </Button>
                </div>
            </div>
        </div>
    )
}
