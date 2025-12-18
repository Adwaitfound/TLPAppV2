"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'

export function NotificationBell() {
    const { user } = useAuth()
    const [unread, setUnread] = useState(0)
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        if (!user?.id) return

        async function fetchUnread() {
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user!.id)
                .eq('read', false)
            setUnread(count || 0)
        }

        fetchUnread()

        const channel = supabase
            .channel('notifications-bell')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                payload => {
                    setUnread(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, user?.id])

    if (!user) return null

    return (
        <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/dashboard/notifications" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center px-1">
                        {unread}
                    </span>
                )}
            </Link>
        </Button>
    )
}
