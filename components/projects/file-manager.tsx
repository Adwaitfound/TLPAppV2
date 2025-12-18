"use client"
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, jsx-a11y/alt-text */

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Upload, Link as LinkIcon, FileText, Image, Video, File, ExternalLink, Trash2, Loader2, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { debug } from "@/lib/debug"
import type { ProjectFile, FileCategory } from "@/types"
import { FILE_CATEGORIES, validateFileSize, formatFileSize, getFileType } from "@/lib/file-upload"
import { useAuth } from "@/contexts/auth-context"
import { getSignedProjectFileUrl } from "@/app/actions/project-file-operations"
import { logAuditEvent } from "@/app/actions/audit-log"

interface FileManagerProps {
    projectId: string
    driveFolderUrl?: string
    onDriveFolderUpdate?: (url: string) => void
}

export function FileManager({ projectId, driveFolderUrl, onDriveFolderUpdate }: FileManagerProps) {
    const { user } = useAuth()
    const [files, setFiles] = useState<ProjectFile[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [linkSubmitting, setLinkSubmitting] = useState(false)
    const [savingDrive, setSavingDrive] = useState(false)
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
    const [isDriveFolderDialogOpen, setIsDriveFolderDialogOpen] = useState(false)
    const [newDriveFolderUrl, setNewDriveFolderUrl] = useState(driveFolderUrl || "")
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null)

    // Refs to prevent race conditions and state corruption
    const isSubmittingRef = useRef(false)
    const isUploadingRef = useRef(false)
    const isSavingDriveRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    const componentMountedRef = useRef(true)

    // Upload form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadCategory, setUploadCategory] = useState<FileCategory>("other")
    const [uploadDescription, setUploadDescription] = useState("")

    // Link form state
    const [linkUrl, setLinkUrl] = useState("")
    const [linkName, setLinkName] = useState("")
    const [linkCategory, setLinkCategory] = useState<FileCategory>("other")
    const [linkDescription, setLinkDescription] = useState("")

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            componentMountedRef.current = false
            // Cancel any pending requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    // Fetch files on mount and when project changes
    useEffect(() => {
        if (!projectId || !componentMountedRef.current) return
        fetchFiles()
    }, [projectId])

    // Keep local state in sync with incoming prop updates ONLY when dialog is closed
    // This prevents the input from changing while the user is editing it
    useEffect(() => {
        if (!isDriveFolderDialogOpen) {
            setNewDriveFolderUrl(driveFolderUrl || "")
        }
    }, [driveFolderUrl, isDriveFolderDialogOpen])

    // Reset forms when dialogs close to avoid re-render loops in onOpenChange
    useEffect(() => {
        if (!isUploadDialogOpen) {
            setSelectedFile(null)
            setUploadDescription("")
            setUploadCategory("other")
            setUploading(false)
            isUploadingRef.current = false
        }
    }, [isUploadDialogOpen])

    useEffect(() => {
        if (!isLinkDialogOpen) {
            console.log('[FileManager] Link dialog closed - resetting form')
            setLinkUrl("")
            setLinkName("")
            setLinkDescription("")
            setLinkCategory("other")
            setLinkSubmitting(false)
            isSubmittingRef.current = false
            debug.log('FILE_MANAGER', 'Add link dialog closed and form reset')
        } else {
            console.log('[FileManager] Link dialog opened')
        }
    }, [isLinkDialogOpen])

    useEffect(() => {
        if (!isDriveFolderDialogOpen) {
            setNewDriveFolderUrl(driveFolderUrl || "")
            setSavingDrive(false)
            isSavingDriveRef.current = false
        }
    }, [isDriveFolderDialogOpen, driveFolderUrl])

    async function fetchFiles() {
        // Guard: already loading or component unmounted
        if (loading || !componentMountedRef.current || !projectId) return

        setLoading(true)
        const supabase = createClient()

        try {
            debug.log('FILE_MANAGER', 'Fetching files...', { projectId })
            const { data, error } = await supabase
                .from('project_files')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Only update state if component still mounted
            if (componentMountedRef.current) {
                setFiles(data || [])
                debug.success('FILE_MANAGER', 'Files fetched', { count: data?.length })
            }
        } catch (error) {
            console.error('Error fetching files:', error)
            debug.error('FILE_MANAGER', 'Error fetching files', {
                message: (error as any)?.message,
                code: (error as any)?.code,
            })
        } finally {
            if (componentMountedRef.current) {
                setLoading(false)
            }
        }
    }

    async function handleFileUpload() {
        // Prevent overlapping uploads
        if (isUploadingRef.current) {
            debug.log('FILE_MANAGER', 'Upload already in progress, ignoring')
            return
        }

        if (!selectedFile) return

        const validation = validateFileSize(selectedFile)
        if (!validation.valid) {
            alert(validation.error)
            return
        }

        // Check file limit
        if (files.length >= 20) {
            alert('Maximum 20 files/links per project. Please delete some files before adding more.')
            return
        }

        isUploadingRef.current = true
        setUploading(true)
        const supabase = createClient()

        try {
            debug.log('FILE_MANAGER', 'Upload start', {
                projectId,
                name: selectedFile.name,
                size: selectedFile.size,
                category: uploadCategory,
            })
            // Upload to Supabase Storage
            const filePath = `${projectId}/${Date.now()}-${selectedFile.name}`
            const { error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(filePath, selectedFile)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('project-files')
                .getPublicUrl(filePath)

            // Save file metadata
            const { data: fileData, error: dbError } = await supabase
                .from('project_files')
                .insert({
                    project_id: projectId,
                    file_name: selectedFile.name,
                    file_type: getFileType(selectedFile.name),
                    file_category: uploadCategory,
                    storage_type: 'supabase',
                    file_url: publicUrl,
                    file_size: selectedFile.size,
                    description: uploadDescription,
                    uploaded_by: user?.id,
                })
                .select()
                .single()

            if (dbError) throw dbError

            // Optimistically add to files array
            if (fileData) {
                setFiles(prev => [fileData, ...prev])
            }

            // Log the file upload
            logAuditEvent({
                action: 'upload',
                entityType: 'file',
                entityId: fileData?.id,
                entityName: selectedFile.name,
                status: 'success',
                newValues: {
                    file_name: selectedFile.name,
                    file_type: getFileType(selectedFile.name),
                    file_category: uploadCategory,
                    file_size: selectedFile.size,
                },
                details: {
                    project_id: projectId,
                    description: uploadDescription,
                },
            }).catch(e => console.warn('Failed to log audit event:', e))

            // Close dialog first
            setIsUploadDialogOpen(false)

            // Reset form
            setSelectedFile(null)
            setUploadDescription("")
            setUploadCategory("other")
            setUploading(false)

            debug.success('FILE_MANAGER', 'Upload saved, added to list, dialog closed')
        } catch (error: any) {
            console.error('Error uploading file:', error)

            // Log the failure
            logAuditEvent({
                action: 'upload',
                entityType: 'file',
                entityName: selectedFile.name,
                status: 'error',
                errorMessage: error?.message,
                details: {
                    project_id: projectId,
                    file_size: selectedFile.size,
                },
            }).catch(e => console.warn('Failed to log audit event:', e))

            debug.error('FILE_MANAGER', 'Upload error', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
            })
            alert(error.message || 'Failed to upload file')
        } finally {
            setUploading(false)
            isUploadingRef.current = false
            debug.log('FILE_MANAGER', 'Upload end - flags reset')
        }
    }

    async function handleAddLink() {
        // ========== GUARDS: Block execution if already in progress ==========
        if (!componentMountedRef.current) return
        if (isSubmittingRef.current || linkSubmitting) {
            console.log('[handleAddLink] BLOCKED: already submitting')
            return
        }

        // ========== VALIDATION ==========
        const trimmedUrl = linkUrl.trim()
        const trimmedName = linkName.trim()

        if (!trimmedUrl || !trimmedName) {
            alert('Please provide both URL and file name')
            return
        }

        if (files.length >= 20) {
            alert('Maximum 20 files/links per project. Please delete some files before adding more.')
            return
        }

        // ========== SET GUARDS ==========
        isSubmittingRef.current = true
        setLinkSubmitting(true)

        const supabase = createClient()

        try {
            console.log('[handleAddLink] ✅ Starting submission')

            // Validate input one more time before submitting
            if (!projectId || !user?.id) {
                throw new Error('Missing projectId or userId')
            }

            // ========== INSERT TO DATABASE ==========
            const { data, error } = await supabase
                .from('project_files')
                .insert({
                    project_id: projectId,
                    file_name: trimmedName,
                    file_type: getFileType(trimmedName),
                    file_category: linkCategory,
                    storage_type: 'google_drive',
                    file_url: trimmedUrl,
                    description: linkDescription,
                    uploaded_by: user.id,
                })
                .select()
                .single()

            if (error) {
                throw error
            }

            if (!data) {
                throw new Error('No data returned from insert')
            }

            console.log('[handleAddLink] ✅ Link inserted successfully')

            // ========== UPDATE LOCAL STATE SAFELY ==========
            if (componentMountedRef.current) {
                setFiles(prev => {
                    // Guard: prevent adding duplicate
                    if (prev.some(f => f.id === data.id)) return prev
                    return [data, ...prev]
                })

                // Close dialog and reset form
                setIsLinkDialogOpen(false)
                setLinkUrl("")
                setLinkName("")
                setLinkDescription("")
                setLinkCategory("other")
            }

            debug.success('FILE_MANAGER', 'Link added successfully')
        } catch (error: any) {
            // ========== ERROR HANDLING ==========
            console.error('[handleAddLink] ❌ Error:', error.message)

            const msg = error?.message?.includes('row-level security')
                ? 'You do not have permissions to add links.'
                : error?.message || 'Failed to add link'

            // Only alert if component still mounted
            if (componentMountedRef.current) {
                alert(msg)
            }

            debug.error('FILE_MANAGER', 'Add link failed', { message: error?.message })
        } finally {
            // ========== ALWAYS RESET GUARDS ==========
            if (componentMountedRef.current) {
                setLinkSubmitting(false)
            }
            isSubmittingRef.current = false
            console.log('[handleAddLink] ✅ Submission complete, guards reset')
        }
    }

    async function handleUpdateDriveFolder() {
        // Prevent overlapping saves
        if (isSavingDriveRef.current) {
            debug.log('FILE_MANAGER', 'Drive folder save already in progress, ignoring')
            return
        }

        const trimmed = newDriveFolderUrl.trim()
        if (!trimmed) return

        // Validate it's a Google Drive URL
        if (!trimmed.includes('drive.google.com')) {
            alert('Please provide a valid Google Drive URL')
            return
        }

        isSavingDriveRef.current = true
        const supabase = createClient()
        setSavingDrive(true)

        try {
            debug.log('FILE_MANAGER', 'Saving drive folder', { projectId, url: trimmed })

            const { error } = await supabase
                .from('projects')
                .update({ drive_folder_url: trimmed })
                .eq('id', projectId)

            if (error) throw error

            debug.success('FILE_MANAGER', 'Drive folder saved successfully')

            // Reset form first
            setNewDriveFolderUrl(trimmed)

            // Then close dialog
            setIsDriveFolderDialogOpen(false)

            // Then notify parent
            onDriveFolderUpdate?.(trimmed)
        } catch (error: any) {
            console.error('Error updating drive folder:', error)
            debug.error('FILE_MANAGER', 'Drive folder save error', {
                message: error?.message,
                code: error?.code,
            })
            alert(error.message || 'Failed to update drive folder')
        } finally {
            setSavingDrive(false)
            isSavingDriveRef.current = false
            debug.log('FILE_MANAGER', 'Drive folder save end - flags reset')
        }
    }

    async function handleDeleteFile(fileId: string, fileUrl: string, storageType: string) {
        if (!confirm('Are you sure you want to delete this file?')) return

        const supabase = createClient()

        try {
            // If it's a Supabase file, delete from storage
            if (storageType === 'supabase') {
                const path = fileUrl.split('/').slice(-2).join('/')
                await supabase.storage.from('project-files').remove([path])
            }

            // Delete from database
            const { error } = await supabase
                .from('project_files')
                .delete()
                .eq('id', fileId)

            if (error) throw error

            // Log the deletion
            logAuditEvent({
                action: 'delete',
                entityType: 'file',
                entityId: fileId,
                status: 'success',
                details: {
                    project_id: projectId,
                    storage_type: storageType,
                },
            }).catch(e => console.warn('Failed to log audit event:', e))

            fetchFiles()
        } catch (error: any) {
            console.error('Error deleting file:', error)

            // Log the failure
            logAuditEvent({
                action: 'delete',
                entityType: 'file',
                entityId: fileId,
                status: 'error',
                errorMessage: error?.message,
                details: {
                    project_id: projectId,
                    storage_type: storageType,
                },
            }).catch(e => console.warn('Failed to log audit event:', e))

            alert(error.message || 'Failed to delete file')
        }
    }

    function parseGoogleDriveId(url: string): string | null {
        try {
            const u = new URL(url)
            // Pattern: /file/d/<id>/
            const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/)
            if (fileMatch) return fileMatch[1]
            // Pattern: open?id=<id>
            const idParam = u.searchParams.get('id')
            if (idParam) return idParam
            // Pattern: uc?id=<id>
            const ucId = u.searchParams.get('id')
            if (ucId) return ucId
        } catch { }
        return null
    }

    function getDrivePreviewUrl(url: string): string | null {
        const id = parseGoogleDriveId(url)
        if (!id) return null
        return `https://drive.google.com/file/d/${id}/preview`
    }

    function getDriveThumbnailUrl(url: string, size = 120): string | null {
        const id = parseGoogleDriveId(url)
        if (!id) return null
        return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`
    }

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    async function openPreview(file: ProjectFile) {
        setPreviewFile(file)
        setPreviewUrl(null)
        setIsPreviewOpen(true)
        if (file.storage_type === 'supabase') {
            const res = await getSignedProjectFileUrl(file.file_url)
            if (!res.error && res.signedUrl) setPreviewUrl(res.signedUrl)
            else setPreviewUrl(file.file_url) // fallback for public buckets
        } else {
            setPreviewUrl(file.file_url)
        }
    }

    async function openFile(file: ProjectFile) {
        if (file.storage_type === 'supabase') {
            const res = await getSignedProjectFileUrl(file.file_url)
            if (res.error || !res.signedUrl) {
                // Fallback for public buckets
                window.open(file.file_url, '_blank')
                return
            }
            window.open(res.signedUrl, '_blank')
        } else {
            window.open(file.file_url, '_blank')
        }
    }

    function FileThumb({ file }: { file: ProjectFile }) {
        const [failed, setFailed] = useState(false)
        const [signedSrc, setSignedSrc] = useState<string | null>(null)
        let src: string | null = null
        if (file.file_type === 'image') {
            if (file.storage_type === 'supabase') {
                src = signedSrc ?? file.file_url // allow public bucket fallback
            } else {
                src = file.file_url
            }
        } else if (file.file_type === 'video' && file.storage_type === 'google_drive') {
            src = getDriveThumbnailUrl(file.file_url, 160)
        }

        useEffect(() => {
            let cancelled = false
            async function run() {
                if (file.file_type === 'image' && file.storage_type === 'supabase') {
                    const res = await getSignedProjectFileUrl(file.file_url, 300)
                    if (!cancelled && !res.error && res.signedUrl) setSignedSrc(res.signedUrl)
                    if (!cancelled && res.error) setSignedSrc(null)
                }
            }
            run()
            return () => { cancelled = true }
        }, [file.file_url, file.file_type, file.storage_type])

        if (!src || failed) {
            return (
                <div className="flex items-center justify-center h-8 w-8 rounded bg-muted">
                    {getFileIcon(file.file_type)}
                </div>
            )
        }
        return (
            <img
                src={src}
                alt={file.file_name}
                className="h-8 w-8 rounded object-cover"
                onError={() => setFailed(true)}
            />
        )
    }

    function getFileIcon(fileType: string) {
        switch (fileType) {
            case 'image':
                return <Image className="h-4 w-4" />
            case 'video':
                return <Video className="h-4 w-4" />
            case 'pdf':
            case 'document':
                return <FileText className="h-4 w-4" />
            default:
                return <File className="h-4 w-4" />
        }
    }

    const filesByCategory = files.reduce((acc, file) => {
        if (!acc[file.file_category]) {
            acc[file.file_category] = []
        }
        acc[file.file_category].push(file)
        return acc
    }, {} as Record<FileCategory, ProjectFile[]>)

    return (
        <div className="space-y-4">
            {/* Drive Folder Link */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Google Drive Folder</CardTitle>
                            <CardDescription>Main project folder for large files</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsDriveFolderDialogOpen(true)}>
                            {driveFolderUrl ? 'Update' : 'Add'} Folder
                        </Button>
                    </div>
                </CardHeader>
                {driveFolderUrl && (
                    <CardContent>
                        <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open Drive Folder
                        </a>
                    </CardContent>
                )}
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button
                            onClick={() => { debug.log('FILE_MANAGER', 'Open upload dialog'); setIsUploadDialogOpen(true) }}
                            disabled={files.length >= 20}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                        </Button>
                        <Button
                            onClick={() => {
                                if (isSubmittingRef.current || isUploadingRef.current) return
                                debug.log('FILE_MANAGER', 'Open add link dialog');
                                setIsLinkDialogOpen(true)
                            }}
                            disabled={files.length >= 20 || linkSubmitting || uploading}
                        >
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Add Drive Link
                        </Button>
                    </div>
                    <p className={`text-sm ${files.length >= 20 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {files.length}/20 files
                    </p>
                </div>
                {files.length >= 20 && (
                    <p className="text-sm text-red-600">
                        Maximum file limit reached. Delete some files to add more.
                    </p>
                )}
            </div>

            {/* Files by Category */}
            {Object.entries(FILE_CATEGORIES).map(([category, config]) => {
                const categoryFiles = filesByCategory[category as FileCategory] || []
                if (categoryFiles.length === 0) return null

                return (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle className="text-lg">{config.label}</CardTitle>
                            <CardDescription>{config.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {categoryFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <FileThumb file={file} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{file.file_name}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className="text-xs">
                                                        {file.storage_type === 'supabase' ? 'Uploaded' : 'Drive Link'}
                                                    </Badge>
                                                    {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                                                </div>
                                                {file.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => openPreview(file)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => openFile(file)}>
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteFile(file.id, file.file_url, file.storage_type)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}

            {files.length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                    </CardContent>
                </Card>
            )}

            {/* Upload File Dialog */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleFileUpload(); }}>
                        <DialogHeader>
                            <DialogTitle>Upload File</DialogTitle>
                            <DialogDescription>
                                Upload documents, images, and small videos to Supabase storage
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>File</Label>
                                <Input
                                    type="file"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="mt-1"
                                    required
                                />
                                {selectedFile && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatFileSize(selectedFile.size)} - Max: {formatFileSize(validateFileSize(selectedFile).valid ? 999999999 : 0)}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as FileCategory)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FILE_CATEGORIES).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                {config.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Description (Optional)</Label>
                                <Textarea
                                    value={uploadDescription}
                                    onChange={(e) => setUploadDescription(e.target.value)}
                                    className="mt-1"
                                    placeholder="Brief description"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={uploading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!selectedFile || uploading}>
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Drive Link Dialog */}
            <Dialog
                open={isLinkDialogOpen}
                onOpenChange={(open) => {
                    // ========== GUARD: Prevent closing while submitting ==========
                    if (!open && isSubmittingRef.current) {
                        console.log('[Dialog] BLOCKED: Cannot close while submitting')
                        return
                    }
                    setIsLinkDialogOpen(open)
                }}
            >
                <DialogContent>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleAddLink();
                    }}>
                        <DialogHeader>
                            <DialogTitle>Add Google Drive Link</DialogTitle>
                            <DialogDescription>
                                Add a link to a file stored in Google Drive
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>File Name</Label>
                                <Input
                                    value={linkName}
                                    onChange={(e) => setLinkName(e.target.value)}
                                    className="mt-1"
                                    placeholder="Final_Edit_v3.mp4"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Google Drive URL</Label>
                                <Input
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    className="mt-1"
                                    placeholder="https://drive.google.com/file/d/..."
                                    required
                                />
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={linkCategory} onValueChange={(v) => setLinkCategory(v as FileCategory)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FILE_CATEGORIES).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>
                                                {config.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Description (Optional)</Label>
                                <Textarea
                                    value={linkDescription}
                                    onChange={(e) => setLinkDescription(e.target.value)}
                                    className="mt-1"
                                    placeholder="Brief description"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)} disabled={linkSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!linkUrl.trim() || !linkName.trim() || linkSubmitting}>
                                {linkSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {linkSubmitting ? 'Adding...' : 'Add Link'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Update Drive Folder Dialog */}
            <Dialog open={isDriveFolderDialogOpen} onOpenChange={setIsDriveFolderDialogOpen}>
                <DialogContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateDriveFolder(); }}>
                        <DialogHeader>
                            <DialogTitle>Set Google Drive Folder</DialogTitle>
                            <DialogDescription>
                                Add the main project folder URL from Google Drive
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label>Folder URL</Label>
                            <Input
                                value={newDriveFolderUrl}
                                onChange={(e) => setNewDriveFolderUrl(e.target.value)}
                                className="mt-1"
                                placeholder="https://drive.google.com/drive/folders/..."
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDriveFolderDialogOpen(false)} disabled={savingDrive}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!newDriveFolderUrl.trim() || !newDriveFolderUrl.includes('drive.google.com') || savingDrive}
                            >
                                {savingDrive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {savingDrive ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Preview</DialogTitle>
                        <DialogDescription>
                            {previewFile?.file_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2">
                        {previewFile && (
                            (() => {
                                const type = previewFile.file_type
                                const url = previewUrl || previewFile.file_url
                                const storage = previewFile.storage_type
                                if (storage === 'supabase' && !previewUrl) {
                                    return (
                                        <div className="text-sm text-muted-foreground p-6 text-center">
                                            Generating secure preview link...
                                        </div>
                                    )
                                }
                                if (type === 'image') {
                                    return (
                                        <img src={url} alt={previewFile.file_name} className="max-h-[70vh] w-auto mx-auto rounded" />
                                    )
                                }
                                if (type === 'video') {
                                    if (storage === 'google_drive') {
                                        const embed = getDrivePreviewUrl(url)
                                        if (embed) {
                                            return (
                                                <iframe
                                                    src={embed}
                                                    className="w-full h-[70vh] rounded"
                                                    allow="autoplay"
                                                    allowFullScreen
                                                />
                                            )
                                        }
                                    }
                                    return (
                                        <video controls className="w-full max-h-[70vh] rounded">
                                            <source src={url} />
                                            Your browser does not support the video tag.
                                        </video>
                                    )
                                }
                                if (type === 'pdf' || url.endsWith('.pdf')) {
                                    return (
                                        <iframe src={url} className="w-full h-[70vh] rounded" />
                                    )
                                }
                                // Fallback
                                return (
                                    <div className="text-center text-sm text-muted-foreground">
                                        Preview not available. Use the open link to view the file.
                                    </div>
                                )
                            })()
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                        {previewFile && (
                            previewFile.storage_type === 'supabase' ? (
                                <Button onClick={() => openFile(previewFile)}>Open in new tab</Button>
                            ) : (
                                <Button asChild>
                                    <a href={previewFile.file_url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
                                </Button>
                            )
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
