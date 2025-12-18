"use client"

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assignCommentToEmployee } from '@/app/actions/client-comments'
import { Input } from '@/components/ui/input'

export default function CommentsAdminPage() {
    const { user } = useAuth()
    const [comments, setComments] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [teamByProject, setTeamByProject] = useState<Record<string, any[]>>({})
    const [assignees, setAssignees] = useState<Record<string, string>>({})
    const [projectFilter, setProjectFilter] = useState<string>('all')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            if (!user) return
            const supabase = createClient()
            setLoading(true)
            try {
                const { data: projectsData } = await supabase
                    .from('projects')
                    .select('id, name, client_id, clients(company_name)')
                    .order('created_at', { ascending: false })

                const { data: commentsData } = await supabase
                    .from('project_comments')
                    .select(`
                        id,
                        project_id,
                        user_id,
                        comment_text,
                        assigned_user_id,
                        status,
                        created_at,
                        author:user_id(full_name, email),
                        assignee:assigned_user_id(full_name, email),
                        projects(name, clients(company_name))
                    `)
                    .order('created_at', { ascending: false })
                    .limit(200)

                const projectIds = projectsData?.map(p => p.id) || []
                const { data: teamRows } = await supabase
                    .from('project_team')
                    .select('project_id, user_id, users(full_name, email)')
                    .in('project_id', projectIds)

                const groupedTeam = (teamRows || []).reduce((acc, row) => {
                    acc[row.project_id] = acc[row.project_id] || []
                    acc[row.project_id].push(row)
                    return acc
                }, {} as Record<string, any[]>)

                setProjects(projectsData || [])
                setComments(commentsData || [])
                setTeamByProject(groupedTeam)
            } catch (e) {
                console.error('Failed to fetch comments admin view', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [user?.id])

    const filtered = useMemo(() => {
        return comments.filter((c) => {
            const matchesProject = projectFilter === 'all' || c.project_id === projectFilter
            const haystack = `${c.comment_text || ''} ${c.projects?.name || ''} ${c.author?.full_name || ''} ${c.author?.email || ''}`.toLowerCase()
            const matchesSearch = haystack.includes(search.toLowerCase())
            return matchesProject && matchesSearch
        })
    }, [comments, projectFilter, search])

    const assign = async (commentId: string, userId: string) => {
        if (!userId) return
        const res = await assignCommentToEmployee({ commentId, userId })
        if (res.success) {
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, assigned_user_id: userId, assignee: res.comment?.assignee } : c))
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Project Comments</CardTitle>
                        <CardDescription>Admin/PM view of all comments across projects</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All projects</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Search comments or authors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-60"
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No comments found</p>
                    ) : (
                        filtered.map((c) => (
                            <div key={c.id} className="p-3 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{c.author?.full_name || c.author?.email || 'Unknown user'}</span>
                                    <span>{new Date(c.created_at).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{c.projects?.name || 'Project'}</p>
                                        <p className="text-xs text-muted-foreground">{c.projects?.clients?.company_name}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{c.status}</span>
                                </div>
                                <p className="text-sm">{c.comment_text}</p>
                                {c.assignee && (
                                    <p className="text-xs text-muted-foreground">Assigned to {c.assignee.full_name || c.assignee.email}</p>
                                )}
                                {teamByProject[c.project_id]?.length ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        <select
                                            className="border rounded px-2 py-1 text-sm"
                                            value={assignees[c.id] ?? c.assigned_user_id ?? ''}
                                            onChange={(e) => setAssignees((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                        >
                                            <option value="">Select assignee</option>
                                            {teamByProject[c.project_id].map((m) => (
                                                <option key={m.user_id} value={m.user_id}>{m.users?.full_name || m.users?.email || 'Member'}</option>
                                            ))}
                                        </select>
                                        <Button size="sm" variant="outline" onClick={() => assignees[c.id] && assign(c.id, assignees[c.id])}>
                                            Assign
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
