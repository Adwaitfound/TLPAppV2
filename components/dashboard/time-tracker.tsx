"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Play, Square, Coffee, PauseCircle } from "lucide-react"
import { clockIn, clockOut, startBreak, endBreak, getActiveTimeEntry, getWeeklyTimeStats } from "@/app/actions/time-tracking"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export function TimeTracker() {
    const { user } = useAuth()
    const [activeEntry, setActiveEntry] = useState<any>(null)
    const [weeklyStats, setWeeklyStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [elapsedTime, setElapsedTime] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [projects, setProjects] = useState<any[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined)
    const [showResumedHint, setShowResumedHint] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        async function fetchProjects() {
            if (!user) return
            setLoadingProjects(true)
            const supabase = createClient()
            try {
                const { data: created, error: createdErr } = await supabase
                    .from('projects')
                    .select('id, name')
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false })

                const { data: team, error: teamErr } = await supabase
                    .from('project_team')
                    .select('projects(id, name)')
                    .eq('user_id', user.id)

                if (createdErr) console.warn('Projects (created) error:', createdErr)
                if (teamErr) console.warn('Projects (team) error:', teamErr)

                const list = [...(created || [])]
                const teamProjects = (team || []).map((t: any) => t.projects).filter(Boolean)
                teamProjects.forEach((p: any) => {
                    if (!list.find(x => x.id === p.id)) list.push(p)
                })
                setProjects(list)
            } catch (e) {
                console.error('Fetch projects error:', e)
            } finally {
                setLoadingProjects(false)
            }
        }
        fetchProjects()
    }, [user?.id])

    useEffect(() => {
        if (activeEntry?.clock_in) {
            const interval = setInterval(() => {
                const start = new Date(activeEntry.clock_in)
                const now = new Date()
                const diff = now.getTime() - start.getTime()
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
            }, 1000)

            return () => clearInterval(interval)
        }
    }, [activeEntry])

    async function loadData() {
        setLoading(true)
        const [entryRes, statsRes] = await Promise.all([
            getActiveTimeEntry(),
            getWeeklyTimeStats()
        ])

        if (entryRes.data) {
            setActiveEntry(entryRes.data)
        }
        if (statsRes.data) {
            setWeeklyStats(statsRes.data)
        }
        setLoading(false)
    }

    async function handleClockIn() {
        if (submitting) return
        setSubmitting(true)
        const result = await clockIn()
        if (result.error) {
            alert(result.error)
        } else {
            await loadData()
        }
        setSubmitting(false)
    }

    async function handleClockOut() {
        if (!activeEntry || submitting) return
        setSubmitting(true)
        const result = await clockOut()
        if (result.error) {
            alert(result.error)
        } else {
            setActiveEntry(null)
            setElapsedTime("")
            await loadData()
        }
        setSubmitting(false)
    }

    async function handleStartBreak() {
        if (submitting) return
        setSubmitting(true)
        const result = await startBreak()
        if (result.error) {
            alert(result.error)
        } else {
            await loadData()
        }
        setSubmitting(false)
    }

    async function handleEndBreak() {
        if (!activeEntry || submitting) return
        setSubmitting(true)
        const result = await endBreak()
        if (result.error) {
            alert(result.error)
        } else {
            // Check for auto-resume work entry and show hint if it just started
            const entryRes = await getActiveTimeEntry()
            if (entryRes.data) {
                setActiveEntry(entryRes.data)
                const started = new Date(entryRes.data.clock_in).getTime()
                const now = Date.now()
                if (entryRes.data.entry_type === 'work' && now - started < 15000) {
                    setShowResumedHint(true)
                    setTimeout(() => setShowResumedHint(false), 4000)
                }
            } else {
                setActiveEntry(null)
            }
            setElapsedTime("")
            const statsRes = await getWeeklyTimeStats()
            if (statsRes.data) setWeeklyStats(statsRes.data)
        }
        setSubmitting(false)
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Tracker
                </CardTitle>
                <CardDescription>Track your work hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Active Timer */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1">
                        {activeEntry ? (
                            <>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="default" className={activeEntry.entry_type === 'break' ? 'bg-amber-600' : 'bg-green-600'}>
                                        {activeEntry.entry_type === 'break' ? 'Break' : 'Active'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {activeEntry.projects?.name || 'No project'}
                                    </span>
                                    {showResumedHint && (
                                        <Badge variant="outline" className="border-green-600 text-green-700">Resumed</Badge>
                                    )}
                                </div>
                                <div className="text-2xl font-mono font-bold">
                                    {elapsedTime}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Started at {new Date(activeEntry.clock_in).toLocaleTimeString()}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium">Not clocked in</p>
                                <p className="text-xs text-muted-foreground">
                                    Click to start tracking time
                                </p>
                                {/* Project selection before clock in */}
                                <div className="mt-3 min-w-[240px]">
                                    <Select
                                        value={selectedProjectId ?? 'none'}
                                        onValueChange={(val) => setSelectedProjectId(val === 'none' ? undefined : val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingProjects ? 'Loading projects…' : 'Select project (optional)'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No project</SelectItem>
                                            {projects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        {activeEntry ? (
                            activeEntry.entry_type === 'break' ? (
                                <Button onClick={handleEndBreak} size="lg" disabled={submitting}>
                                    <PauseCircle className="h-4 w-4 mr-2" />
                                    {submitting ? 'Working…' : 'End Break'}
                                </Button>
                            ) : (
                                <Button onClick={handleClockOut} variant="destructive" size="lg" disabled={submitting}>
                                    <Square className="h-4 w-4 mr-2" />
                                    {submitting ? 'Working…' : 'Clock Out'}
                                </Button>
                            )
                        ) : (
                            <div className="flex gap-2">
                                <Button onClick={handleClockIn} size="lg" disabled={submitting}>
                                    <Play className="h-4 w-4 mr-2" />
                                    {submitting ? 'Working…' : 'Clock In'}
                                </Button>
                                <Button onClick={handleStartBreak} variant="outline" size="lg" disabled={submitting}>
                                    <Coffee className="h-4 w-4 mr-2" />
                                    Break
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weekly Stats */}
                {weeklyStats && (
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 border rounded-lg">
                            <p className="text-2xl font-bold">{Math.round(weeklyStats.totalHours * 10) / 10}h</p>
                            <p className="text-xs text-muted-foreground">This Week</p>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                            <p className="text-2xl font-bold">{Math.round(weeklyStats.billableHours * 10) / 10}h</p>
                            <p className="text-xs text-muted-foreground">Billable</p>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                            <p className="text-2xl font-bold">{weeklyStats.entries}</p>
                            <p className="text-xs text-muted-foreground">Days</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
