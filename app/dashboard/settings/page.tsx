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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Building2, Bell, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { debug } from "@/lib/debug"

export default function SettingsPage() {
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
    phone: "",
    bio: "",
    avatar_url: "",
  })

  // Company form state
  const [companyData, setCompanyData] = useState({
    company_name: "",
    website: "",
    industry: "media",
    address: "",
    tax_id: "",
    company_size: "small",
  })

  useEffect(() => {
    if (user) {
      debug.log('SETTINGS', 'Loading user data', { userId: user.id })
      setProfileData({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
        avatar_url: user.avatar_url || "",
      })

      if (user.role === 'admin' || user.role === 'project_manager') {
        setCompanyData({
          company_name: user.company_name || "",
          website: user.website || "",
          industry: user.industry || "media",
          address: user.address || "",
          tax_id: user.tax_id || "",
          company_size: user.company_size || "small",
        })
      }
    }
  }, [user])

  async function handleSaveProfile() {
    if (!user) return

    setSaving(true)
    debug.log('SETTINGS', 'Saving profile', { userId: user.id })

    const supabase = createClient()

    try {
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      debug.success('SETTINGS', 'Profile saved')
      if (updatedProfile) {
        setUser(updatedProfile as any)
      }
      setSavedMessage("Profile updated successfully!")
      setTimeout(() => setSavedMessage(""), 3000)
    } catch (error: any) {
      debug.error('SETTINGS', 'Save profile error', { message: error.message })
      alert('Failed to save profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCompany() {
    if (!user) return

    setSaving(true)
    debug.log('SETTINGS', 'Saving company data', { userId: user.id })

    const supabase = createClient()

    try {
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .update({
          company_name: companyData.company_name,
          website: companyData.website,
          industry: companyData.industry,
          address: companyData.address,
          tax_id: companyData.tax_id,
          company_size: companyData.company_size,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      debug.success('SETTINGS', 'Company data saved')
      if (updatedProfile) {
        setUser(updatedProfile as any)
      }
      setSavedMessage("Company information updated successfully!")
      setTimeout(() => setSavedMessage(""), 3000)
    } catch (error: any) {
      debug.error('SETTINGS', 'Save company error', { message: error.message })
      alert('Failed to save company information: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (passwordData.new !== passwordData.confirm) {
      alert("New passwords don't match")
      return
    }

    if (passwordData.new.length < 6) {
      alert("Password must be at least 6 characters")
      return
    }

    setSaving(true)
    debug.log('SETTINGS', 'Changing password')

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      })

      if (error) throw error

      debug.success('SETTINGS', 'Password changed')
      setSavedMessage("Password updated successfully!")
      setPasswordData({ current: "", new: "", confirm: "" })
      setTimeout(() => setSavedMessage(""), 3000)
    } catch (error: any) {
      debug.error('SETTINGS', 'Change password error', { message: error.message })
      alert('Failed to change password: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Success Message */}
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile" className="text-xs md:text-sm">
            <User className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Profile</span>
          </TabsTrigger>
          {(user.role === 'admin' || user.role === 'project_manager') && (
            <TabsTrigger value="company" className="text-xs md:text-sm">
              <Building2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Company</span>
            </TabsTrigger>
          )}
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
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileData.avatar_url} />
                  <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: <span className="capitalize">{user.role.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
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
                    className="opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (user) {
                      setProfileData({
                        full_name: user.full_name || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        bio: user.bio || "",
                        avatar_url: user.avatar_url || "",
                      })
                    }
                  }}
                >
                  Reset
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        {(user.role === 'admin' || user.role === 'project_manager') && (
          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Manage your company details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyData.company_name}
                    onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={companyData.website}
                    onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={companyData.industry}
                    onValueChange={(value) => setCompanyData({ ...companyData, industry: value })}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="media">Media & Entertainment</SelectItem>
                      <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                      <SelectItem value="production">Video Production</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Address</Label>
                  <Textarea
                    id="companyAddress"
                    placeholder="Enter your company address"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      placeholder="XX-XXXXXXX"
                      value={companyData.tax_id}
                      onChange={(e) => setCompanyData({ ...companyData, tax_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select
                      value={companyData.company_size}
                      onValueChange={(value) => setCompanyData({ ...companyData, company_size: value })}
                    >
                      <SelectTrigger id="companySize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Solo (1)</SelectItem>
                        <SelectItem value="small">Small (2-10)</SelectItem>
                        <SelectItem value="medium">Medium (11-50)</SelectItem>
                        <SelectItem value="large">Large (50+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Reset</Button>
                  <Button onClick={handleSaveCompany} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage your notification settings (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Notification preferences will be available in a future update.
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
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    placeholder="Re-enter your new password"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasswordData({ current: "", new: "", confirm: "" })}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !passwordData.new || !passwordData.confirm}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
