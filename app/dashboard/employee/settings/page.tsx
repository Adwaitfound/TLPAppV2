"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { debug } from "@/lib/debug"

export default function EmployeeSettingsPage() {
    const { user, loading: authLoading, setUser } = useAuth()
    const [saving, setSaving] = useState(false)
    const [savedMessage, setSavedMessage] = useState("")
    const [passwordData, setPasswordData] = useState({
        current: "",
        new: "",
        confirm: "",
    })

    // Profile form state
    const [profileData, setProfileData] = useState({
        full_name: "",
        email: "",
        avatar_url: "",
    })

    useEffect(() => {
        if (user) {
            debug.log('SETTINGS', 'Loading user data', { userId: user.id })
            setProfileData({
                full_name: user.full_name || "",
                email: user.email || "",
                avatar_url: user.avatar_url || "",
            })
        }
    }, [user])

    const handleProfileSave = async () => {
        if (!user) return

        setSaving(true)
        setSavedMessage("")

        try {
            const supabase = createClient()

            debug.log('SETTINGS', 'Saving profile', { userId: user.id, data: profileData })

            const { data: updatedUser, error } = await supabase
                .from('users')
                .update({
                    full_name: profileData.full_name,
                    avatar_url: profileData.avatar_url,
                })
                .eq('id', user.id)
                .select()
                .single()

            if (error) {
                debug.error('SETTINGS', 'Error saving profile', error)
                throw error
            }

            debug.log('SETTINGS', 'Profile saved successfully', updatedUser)

            // Update auth context with new user data
            if (updatedUser) {
                setUser({
                    ...user,
                    full_name: updatedUser.full_name,
                    avatar_url: updatedUser.avatar_url,
                })
            }

            setSavedMessage("Profile updated successfully!")
            setTimeout(() => setSavedMessage(""), 3000)
        } catch (error: any) {
            console.error('Error saving profile:', error)
            setSavedMessage(`Error: ${error.message}`)
            setTimeout(() => setSavedMessage(""), 5000)
        } finally {
            setSaving(false)
        }
    }

    const handlePasswordChange = async () => {
        if (!passwordData.new || !passwordData.confirm) {
            setSavedMessage("Please fill in all password fields")
            setTimeout(() => setSavedMessage(""), 3000)
            return
        }

        if (passwordData.new !== passwordData.confirm) {
            setSavedMessage("New passwords do not match")
            setTimeout(() => setSavedMessage(""), 3000)
            return
        }

        setSaving(true)
        setSavedMessage("")

        try {
            const supabase = createClient()

            const { error } = await supabase.auth.updateUser({
                password: passwordData.new
            })

            if (error) throw error

            setSavedMessage("Password updated successfully!")
            setPasswordData({ current: "", new: "", confirm: "" })
            setTimeout(() => setSavedMessage(""), 3000)
        } catch (error: any) {
            console.error('Error changing password:', error)
            setSavedMessage(`Error: ${error.message}`)
            setTimeout(() => setSavedMessage(""), 5000)
        } finally {
            setSaving(false)
        }
    }

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {savedMessage && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">{savedMessage}</span>
                </div>
            )}

            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Manage your account settings and preferences
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile" className="text-xs md:text-sm">
                        <User className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="text-xs md:text-sm">
                        <Bell className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Notifications</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="text-xs md:text-sm">
                        <Lock className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Security</span>
                    </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>
                                Update your personal information and profile picture
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={profileData.avatar_url} />
                                    <AvatarFallback className="text-2xl">
                                        {(profileData.full_name || profileData.email || 'U')
                                            .split(/\s+/)
                                            .map(part => part.charAt(0))
                                            .join('')
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-medium">Profile Picture</p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            placeholder="Avatar URL"
                                            value={profileData.avatar_url}
                                            onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Enter an image URL for your profile picture
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Full Name</Label>
                                    <Input
                                        id="full_name"
                                        value={profileData.full_name}
                                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profileData.email}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                                        <span className="capitalize">{user.role.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleProfileSave} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>
                                Manage how you receive notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Notification settings will be available soon.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new_password">New Password</Label>
                                <Input
                                    id="new_password"
                                    type="password"
                                    value={passwordData.new}
                                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm_password">Confirm New Password</Label>
                                <Input
                                    id="confirm_password"
                                    type="password"
                                    value={passwordData.confirm}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handlePasswordChange} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
