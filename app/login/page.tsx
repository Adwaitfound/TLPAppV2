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

        // Set a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            console.error('Login timeout - taking longer than expected')
            setLoading(false)
            setError('Login is taking too long. Please try again.')
        }, 10000) // 10 second timeout

        try {
            // Always clear any existing session to avoid cross-account bleed
            await supabase.auth.signOut()

            console.log('Step 1: Attempting login with:', email)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            console.log('Step 2: Auth response received', {
                authError: authError?.message,
                userId: authData?.user?.id,
                authenticatedEmail: authData?.user?.email
            })

            if (authError) {
                console.error('Auth error:', authError)
                throw authError
            }

            if (!authData.user) {
                throw new Error('No user returned from authentication')
            }

            console.log('Step 3: User authenticated:', authData.user.id)

            // Fetch user data from users table
            console.log('Step 4: Fetching user profile...')
            const { data: usersData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)

            console.log('Step 5: User profile response', {
                error: userError?.message,
                rowCount: usersData?.length,
                role: usersData?.[0]?.role
            })

            if (userError) {
                console.error('User data error:', {
                    message: userError.message,
                    code: userError.code,
                    details: userError.details
                })
                throw new Error('Failed to fetch user profile. Please try again or contact support.')
            }

            // Handle case where user doesn't exist in users table
            if (!usersData || usersData.length === 0) {
                console.error('User profile not found in database for:', authData.user.id)
                // Create a default user profile if it doesn't exist
                console.log('Step 6: Creating user profile...')
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email: authData.user.email,
                        full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
                        role: 'project_manager'
                    })

                if (insertError) {
                    console.error('Failed to create user profile:', insertError)
                    throw new Error('Failed to create user profile. Please contact support.')
                }

                console.log('Step 7: User profile created, redirecting to employee dashboard')
                router.push('/dashboard/employee')
                clearTimeout(timeout)
                return
            }

            const userData = usersData[0]
            console.log('Step 6: User data fetched, redirecting based on role:', userData.role)

            // Small delay to ensure session is properly set before redirect
            await new Promise(resolve => setTimeout(resolve, 500))

            // Redirect based on role
            if (userData.role === 'admin') {
                console.log('Redirecting to admin dashboard')
                router.push('/dashboard')
            } else if (userData.role === 'client') {
                console.log('Redirecting to client dashboard')
                router.push('/dashboard/client')
            } else {
                console.log('Redirecting to employee dashboard')
                router.push('/dashboard/employee')
            }

            clearTimeout(timeout)
        } catch (err: any) {
            console.error('Login error:', err)
            setError(err.message || 'Failed to log in')
            setLoading(false)
            clearTimeout(timeout)
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
