'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Video, Users, Briefcase, Shield } from 'lucide-react';
import type { UserRole } from '@/types';

export default function SignupPage() {
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

    const roleConfig = {
        client: {
            title: 'Client Account',
            description: 'Access your projects and track progress',
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
        },
        employee: {
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

            // Create user record in public.users
            const { error: userError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    role: role,
                    company_name: companyName || null,
                });

            if (userError) throw userError;

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
            setError(err.message || 'Failed to create account. Please try again.');
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
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
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
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                        type="text"
                                        placeholder="Your Company"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone (Optional)</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (555) 123-4567"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {(role === 'admin' || role === 'employee') && (
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name (Optional)</Label>
                                <Input
                                    id="companyName"
                                    type="text"
                                    placeholder="Your Company"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
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
