"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Video } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { debug } from "@/lib/debug"
import { forceConfirmEmail } from "@/app/actions/force-confirm-email"
import { registerPendingUser } from "@/app/actions/register-pending-user"
import type { UserRole } from "@/types"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const describeError = (err: any) => {
        const code = err?.code || err?.status
        if (code === 'invalid_grant' || err?.message?.toLowerCase().includes('invalid login')) return 'Invalid email or password'
        if (code === 'email_not_confirmed') return 'Please verify your email before logging in'
        if (code === 'rate_limit_exceeded') return 'Too many attempts. Please wait and try again.'
        return err?.message || 'Failed to log in'
    }

    // Hard reset any existing session when landing on login to avoid cross-account reuse
    useEffect(() => {
        const resetSession = async () => {
            try {
                await supabase.auth.signOut()
            } catch (err) {
                debug.warn('LOGIN', 'Initial signOut on login mount failed', { message: (err as any)?.message })
            }
        }
        resetSession()

        // Aggressively clear form fields to prevent browser autofill
        setTimeout(() => {
            setEmail("")
            setPassword("")
            // Also clear any browser-filled values in the DOM
            const emailInput = document.getElementById('email') as HTMLInputElement
            const passwordInput = document.getElementById('password') as HTMLInputElement
            if (emailInput) emailInput.value = ""
            if (passwordInput) passwordInput.value = ""
        }, 100)

        // Cleanup on unmount
        return () => {
            setEmail("")
            setPassword("")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
            debug.log('LOGIN', 'Attempting login', { email })
            let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            console.log('Step 2: Auth response received', {
                authError: authError?.message,
                userId: authData?.user?.id,
                authenticatedEmail: authData?.user?.email
            })

            if (authError) {
                // Auto-confirm email if required, then retry once
                if ((authError as any)?.code === 'email_not_confirmed') {
                    debug.warn('LOGIN', 'Email not confirmed, attempting server-side confirm', { email })
                    const res = await forceConfirmEmail(email)
                    if (res.success) {
                        debug.success('LOGIN', 'Email confirmed server-side, retrying login', { userId: res.userId })
                        const retry = await supabase.auth.signInWithPassword({ email, password })
                        authData = retry.data
                        authError = retry.error as any
                    }
                }
                if (authError) {
                    console.error('Auth error:', authError)
                    throw authError
                }
            }

            if (!authData.user) {
                throw new Error('No user returned from authentication')
            }

            console.log('Step 3: User authenticated:', authData.user.id)
            debug.success('LOGIN', 'User authenticated', { userId: authData.user.id })

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
            }

            // Handle case where user doesn't exist in users table
            let userData = usersData && usersData.length > 0 ? usersData[0] : null
            if (!userData) {
                console.error('User profile not found by id; trying email lookup:', authData.user.id)
                const { data: byEmail } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', authData.user.email!)
                    .limit(1)
                if (byEmail && byEmail.length > 0) {
                    userData = byEmail[0]
                } else {
                    // Last resort: create via server action with service role to avoid RLS issues
                    const role: UserRole = (authData.user.user_metadata?.role as UserRole) || 'project_manager'
                    const res = await registerPendingUser({
                        id: authData.user.id,
                        email: authData.user.email!,
                        full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
                        role,
                        company_name: authData.user.user_metadata?.company_name || null,
                    })
                    if (!res.success) {
                        console.error('Failed to create user profile via server action:', res.error)
                        throw new Error('Failed to create user profile. Please contact support.')
                    }
                    // Fetch newly created profile
                    const { data: created } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', authData.user.id)
                        .limit(1)
                    userData = created?.[0] || null
                    if (!userData) {
                        throw new Error('Profile creation completed but could not load profile. Please retry.')
                    }
                }
            }

            // userData is ensured above
            console.log('Step 6: User data fetched, redirecting based on role:', userData.role)
            debug.success('LOGIN', 'Profile fetched', { role: userData.role, email: userData.email })

            // Block client accounts until an admin approves
            if (userData.role === 'client') {
                const status = (userData as any).status || 'pending'
                if (status !== 'approved') {
                    const reason = status === 'rejected'
                        ? 'Your account was rejected. Please contact support.'
                        : 'Your account is pending admin approval. Please wait for an approval email.'
                    debug.warn('LOGIN', 'Blocked pending/rejected client', { status, email: userData.email })
                    await supabase.auth.signOut()
                    clearTimeout(timeout)
                    setError(reason)
                    return
                }
            }

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
            const message = describeError(err)
            debug.error('LOGIN', 'Login failed', { message, code: err?.code })
            setError(message)
        } finally {
            clearTimeout(timeout)
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
                    <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                        {/* Hidden dummy fields to prevent autofill */}
                        <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                        <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="user-email-login"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="off"
                                data-lpignore="true"
                                data-form-type="other"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="user-password-login"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                data-lpignore="true"
                                data-form-type="other"
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground space-y-2">
                            <div>
                                Don&apos;t have an account?{' '}
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
