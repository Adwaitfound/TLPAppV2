"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { markAllNotificationsRead } from '@/app/actions/notifications'

export default function NotificationsPage() {
    const { user } = useAuth()
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [marking, setMarking] = useState(false)

    useEffect(() => {
        async function fetchNotifications() {
            if (!user) return
            const supabase = createClient()
            setLoading(true)
            try {
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(200)
                setItems(data || [])
            } catch (e) {
                console.error('Failed to fetch notifications', e)
            } finally {
                setLoading(false)
            }
        }
        fetchNotifications()
    }, [user?.id])

    const markAll = async () => {
        if (!user) return
        setMarking(true)
        const res = await markAllNotificationsRead(user.id)
        if (res.success) {
            setItems(prev => prev.map(n => ({ ...n, read: true })))
        }
        setMarking(false)
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>In-app alerts for comments and assignments</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={markAll} disabled={marking}>Mark all read</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No notifications</p>
                    ) : (
                        items.map((n) => (
                            <div key={n.id} className={`p-3 border rounded-lg ${n.read ? 'bg-background' : 'bg-accent/20'}`}>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{n.type}</span>
                                    <span>{new Date(n.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-sm">{n.message}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
