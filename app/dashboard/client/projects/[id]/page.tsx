"use client"

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Download, Mic, StopCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { createProjectComment, listProjectComments, clientApproveProject, assignCommentToEmployee } from '@/app/actions/client-comments'

export default function ClientProjectPage() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { user } = useAuth()
    const [project, setProject] = useState<any | null>(null)
    const [files, setFiles] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [comments, setComments] = useState<any[]>([])
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [assignees, setAssignees] = useState<Record<string, string>>({})
    const [commentText, setCommentText] = useState('')
    const [recording, setRecording] = useState<MediaRecorder | null>(null)
    const [audioChunks, setAudioChunks] = useState<Blob[]>([])
    const [commentSubmitting, setCommentSubmitting] = useState(false)
    const [commentError, setCommentError] = useState<string | null>(null)
    const [restrictAccess, setRestrictAccess] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            if (!user || !id) return
            const supabase = createClient()
            try {
                const { data: proj, error: projErr } = await supabase
                    .from('projects')
                    .select('*, clients(company_name)')
                    .eq('id', id)
                    .single()
                if (projErr) throw projErr
                setProject(proj)

                const { data: filesData } = await supabase
                    .from('project_files')
                    .select('*')
                    .eq('project_id', id)
                    .order('created_at', { ascending: false })
                setFiles(filesData || [])

                const { data: invData } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('project_id', id)
                    .order('due_date', { ascending: true })
                setInvoices(invData || [])

                const restr = (invData || []).some(inv => inv.status !== 'paid' && inv.due_date && (new Date(inv.due_date).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000))
                setRestrictAccess(restr)

                const res = await listProjectComments(id)
                if (res.success) setComments(res.comments || [])
            } catch (e) {
                console.error('Client project fetch failed:', (e as any)?.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, user?.id])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
            const chunks: Blob[] = []
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
            recorder.onstop = () => setAudioChunks(chunks)
            recorder.start()
            setRecording(recorder)
        } catch (e) {
            console.error('Failed to start recording:', (e as any)?.message)
        }
    }

    const stopRecording = () => {
        if (recording) {
            recording.stop()
            setRecording(null)
        }
    }

    const submitComment = async () => {
        setCommentError(null)
        setCommentSubmitting(true)
        try {
            const trimmed = commentText.trim()
            if (!trimmed) {
                setCommentError('Please add a comment before submitting')
                setCommentSubmitting(false)
                return
            }
            const res = await createProjectComment({ projectId: id, authorUserId: user!.id, text: trimmed })
            if (res.success) {
                const refreshed = await listProjectComments(id)
                if (refreshed.success) {
                    setComments(refreshed.comments || [])
                } else {
                    setComments(prev => [res.comment, ...prev])
                }
                setCommentText('')
                setAudioChunks([])
            }
            if (!res.success) setCommentError(res.error || 'Could not submit comment')
        } catch (e) {
            console.error('Submit comment failed:', (e as any)?.message)
            setCommentError((e as any)?.message || 'Unexpected error submitting comment')
        } finally {
            setCommentSubmitting(false)
        }
    }

    const approveProject = async () => {
        const res = await clientApproveProject({ projectId: id })
        if (res.success) {
            setProject((p: any) => ({ ...p, client_approved: true, client_approved_at: new Date().toISOString() }))
        }
    }

    const assignComment = async (commentId: string, userId: string) => {
        if (!userId) return
        const res = await assignCommentToEmployee({ commentId, userId })
        if (res.success) {
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, assigned_user_id: userId, assignee: res.comment?.assignee } : c))
        }
    }

    if (loading || !project) {
        return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Loading…</p></div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.clients?.company_name}</CardDescription>
                </CardHeader>
                <CardContent>
                    {restrictAccess && (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <p className="text-sm text-destructive">Access restricted: invoice overdue by 30+ days. Please settle dues to continue.</p>
                        </div>
                    )}
                    <div className="space-y-3">
                        {files.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No files yet</p>
                        ) : (
                            files.map((f) => (
                                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-medium text-sm">{f.file_name}</p>
                                        <p className="text-xs text-muted-foreground">Uploaded {new Date(f.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" disabled={restrictAccess} onClick={() => window.open(f.file_url, '_blank', 'noopener')}>View</Button>
                                        <Button size="sm" variant="ghost" disabled={restrictAccess} onClick={() => window.open(f.file_url, '_blank', 'noopener')}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Comments</CardTitle>
                    <CardDescription>Leave change requests or feedback. Admins are notified.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Textarea placeholder="Type your comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={submitComment} disabled={commentSubmitting || !commentText.trim()}>
                                {commentSubmitting ? 'Submitting…' : 'Submit'}
                            </Button>
                        </div>
                        {commentError && <p className="text-xs text-destructive">{commentError}</p>}
                    </div>
                    <div className="space-y-3">
                        {comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No comments yet</p>
                        ) : (
                            comments.map((c) => (
                                <div key={c.id} className="p-3 border rounded-lg space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{c.author?.full_name || c.author?.email || 'Unknown user'}</span>
                                        <span>{new Date(c.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm">{c.comment_text}</p>
                                    {c.assignee && (
                                        <p className="text-xs text-muted-foreground">Assigned to {c.assignee.full_name || c.assignee.email}</p>
                                    )}
                                    {(user?.role === 'admin' || user?.role === 'project_manager') && teamMembers.length > 0 && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <select
                                                className="border rounded px-2 py-1 text-sm"
                                                value={assignees[c.id] ?? c.assigned_user_id ?? ''}
                                                onChange={(e) => setAssignees((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                            >
                                                <option value="">Select assignee</option>
                                                {teamMembers.map((m) => (
                                                    <option key={m.user_id} value={m.user_id}>{m.users?.full_name || m.users?.email || 'Member'}</option>
                                                ))}
                                            </select>
                                            <Button size="sm" variant="outline" onClick={() => assignees[c.id] && assignComment(c.id, assignees[c.id])}>
                                                Assign
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Approval</CardTitle>
                    <CardDescription>Approve the project when ready.</CardDescription>
                </CardHeader>
                <CardContent>
                    {project.client_approved ? (
                        <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /> Approved on {new Date(project.client_approved_at).toLocaleString()}</div>
                    ) : (
                        <Button onClick={approveProject}><CheckCircle2 className="h-4 w-4 mr-1" /> Mark Approved</Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
