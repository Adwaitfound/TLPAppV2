"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Video } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) throw authError

            if (authData.user) {
                // Fetch user data from users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single()

                if (userError) throw userError

                // Redirect based on role
                if (userData.role === 'admin') {
                    router.push('/dashboard')
                } else if (userData.role === 'client') {
                    router.push('/dashboard/client')
                } else {
                    router.push('/dashboard/employee')
                }
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message || 'Failed to log in')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Video className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Welcome Back</CardTitle>
                    <CardDescription>
                        Sign in to your video production account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground space-y-2">
                            <div>
                                Don't have an account?{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => router.push("/signup")}
                                    className="text-primary p-0 h-auto font-normal"
                                >
                                    Sign up here
                                </Button>
                            </div>
                            <div>
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => router.push("/")}
                                    className="text-muted-foreground"
                                >
                                    ← Back to Home
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
