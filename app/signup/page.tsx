'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Briefcase, Shield } from 'lucide-react';
import type { UserRole } from '@/types';
import { debug } from '@/lib/debug';

function SignupForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = (searchParams.get('role') || 'client') as UserRole;

    const describeError = (err: any) => {
        const code = err?.code || err?.status
        if (code === 'user_already_exists') return 'An account with this email already exists.'
        if (code === 'rate_limit_exceeded') return 'Too many attempts. Please wait and try again.'
        if (err?.message?.toLowerCase().includes('password')) return 'Password is too weak. Please choose a stronger one.'
        return err?.message || 'Failed to create account. Please try again.'
    }

    const roleConfig: Record<UserRole, {
        title: string;
        description: string;
        icon: any;
        color: string;
    }> = {
        client: {
            title: 'Client Account',
            description: 'Access your projects and track progress',
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
        },
        project_manager: {
            title: 'Employee Account',
            description: 'Manage projects and collaborate with team',
            icon: Briefcase,
            color: 'from-purple-500 to-pink-500',
        },
        admin: {
            title: 'Admin Account',
            description: 'Full system access and management',
            icon: Shield,
            color: 'from-orange-500 to-red-500',
        },
    };

    const config = roleConfig[role];
    const Icon = config.icon;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const supabase = createClient();

            debug.log('SIGNUP', 'Starting signup', { email, role })

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        company_name: companyName,
                        role: role,
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create user account');

            debug.success('SIGNUP', 'Auth user created', { userId: authData.user.id })

            // Create user record in public.users
            const { error: userError } = await supabase
                .from('users')
                .upsert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    role: role,
                    company_name: companyName || null,
                });

            if (userError) throw userError;

            debug.success('SIGNUP', 'User profile stored', { role, email })

            // Create role-specific records
            if (role === 'client') {
                const { error: clientError } = await supabase
                    .from('clients')
                    .insert({
                        user_id: authData.user.id,
                        company_name: companyName || fullName,
                        contact_person: fullName,
                        email: email,
                        phone: phone || null,
                        status: 'active',
                        total_projects: 0,
                        total_revenue: 0,
                    });

                if (clientError) throw clientError;
                debug.success('SIGNUP', 'Client record created', { email })
            }

            // Redirect based on role
            if (role === 'admin') {
                router.push('/dashboard');
            } else if (role === 'client') {
                router.push('/dashboard/client');
            } else {
                router.push('/dashboard/employee');
            }

        } catch (err: any) {
            console.error('Signup error:', err);
            const message = describeError(err);
            debug.error('SIGNUP', 'Signup failed', { message, code: err?.code })
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br ${config.color} p-0.5`}>
                        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <Icon className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Create {config.title}</CardTitle>
                    <CardDescription>
                        {config.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                                id="fullName"
                                name="user-fullname-signup"
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                name="user-email-signup"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="off"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                name="user-password-signup"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="off"
                                required
                                minLength={6}
                            />
                            <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                        </div>

                        {role === 'client' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name *</Label>
                                    <Input
                                        id="companyName"
                                        name="user-company-signup"
                                        type="text"
                                        placeholder="Your Company"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone (Optional)</Label>
                                    <Input
                                        id="phone"
                                        name="user-phone-signup"
                                        type="tel"
                                        placeholder="+1 (555) 123-4567"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </>
                        )}

                        {(role === 'admin' || role === 'project_manager') && (
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name (Optional)</Label>
                                <Input
                                    id="companyName"
                                    name="user-company-signup"
                                    type="text"
                                    placeholder="Your Company"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Creating Account...' : `Sign Up as ${config.title.replace(' Account', '')}`}
                        </Button>

                        <div className="text-center text-sm text-muted-foreground space-y-2">
                            <div>
                                Already have an account?{' '}
                                <Link href="/login" className="text-primary hover:underline">
                                    Sign In
                                </Link>
                            </div>
                            <div>
                                <Link href="/auth/select-role" className="text-primary hover:underline">
                                    ← Choose a different role
                                </Link>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <SignupForm />
        </Suspense>
    );
}
