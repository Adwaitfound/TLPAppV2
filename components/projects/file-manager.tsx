"use client"

import { useEffect, useState } from "react"
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
import { Upload, Link as LinkIcon, FileText, Image, Video, File, Download, ExternalLink, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { debug } from "@/lib/debug"
import type { ProjectFile, FileCategory } from "@/types"
import { FILE_CATEGORIES, validateFileSize, formatFileSize, getFileType, getGoogleDriveEmbedUrl } from "@/lib/file-upload"
import { useAuth } from "@/contexts/auth-context"

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

    // Upload form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadCategory, setUploadCategory] = useState<FileCategory>("other")
    const [uploadDescription, setUploadDescription] = useState("")

    // Link form state
    const [linkUrl, setLinkUrl] = useState("")
    const [linkName, setLinkName] = useState("")
    const [linkCategory, setLinkCategory] = useState<FileCategory>("other")
    const [linkDescription, setLinkDescription] = useState("")

    // Fetch files on mount and when project changes
    useEffect(() => {
        fetchFiles()
    }, [projectId])

    // Keep local state in sync with incoming prop updates
    useEffect(() => {
        setNewDriveFolderUrl(driveFolderUrl || "")
    }, [driveFolderUrl])

    async function fetchFiles() {
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
            setFiles(data || [])
            debug.success('FILE_MANAGER', 'Files fetched', { count: data?.length })
        } catch (error) {
            console.error('Error fetching files:', error)
            debug.error('FILE_MANAGER', 'Error fetching files', {
                message: (error as any)?.message,
                code: (error as any)?.code,
            })
        } finally {
            setLoading(false)
        }
    }

    async function handleFileUpload() {
        if (!selectedFile || uploading) return

        const validation = validateFileSize(selectedFile)
        if (!validation.valid) {
            alert(validation.error)
            return
        }

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
            const { error: dbError } = await supabase
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

            if (dbError) throw dbError

            // Reset form and close first
            setSelectedFile(null)
            setUploadDescription("")
            setIsUploadDialogOpen(false)
            debug.success('FILE_MANAGER', 'Upload saved, dialog closed')
            
            // Then refresh
            await fetchFiles()
        } catch (error: any) {
            console.error('Error uploading file:', error)
            debug.error('FILE_MANAGER', 'Upload error', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
            })
            alert(error.message || 'Failed to upload file')
        } finally {
            setUploading(false)
            debug.log('FILE_MANAGER', 'Upload end')
        }
    }

    async function handleAddLink() {
        if (!linkUrl || !linkName || linkSubmitting) {
            if (!linkUrl || !linkName) {
                alert('Please provide both URL and file name')
            }
            return
        }

        setLinkSubmitting(true)
        const supabase = createClient()

        try {
            debug.log('FILE_MANAGER', 'Add link start', {
                projectId,
                name: linkName,
                url: linkUrl,
                category: linkCategory,
            })
            // Wrap insert in a timeout to avoid indefinite spinner if network hangs
            async function insertWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
                let timeoutId: any
                const timeout = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('Add link timed out. Check network or RLS policies.')), ms)
                })
                try {
                    const result = await Promise.race([p, timeout]) as T
                    clearTimeout(timeoutId)
                    return result
                } catch (err) {
                    clearTimeout(timeoutId)
                    throw err
                }
            }

            debug.log('FILE_MANAGER', 'Add link inserting...')
            const insertPromise = supabase
                .from('project_files')
                .insert({
                    project_id: projectId,
                    file_name: linkName,
                    file_type: getFileType(linkName),
                    file_category: linkCategory,
                    storage_type: 'google_drive',
                    file_url: linkUrl,
                    description: linkDescription,
                    uploaded_by: user?.id,
                })
            
            const { error } = await insertWithTimeout(insertPromise, 12000) as any

            if (error) throw error

            // Reset form and close first
            setLinkUrl("")
            setLinkName("")
            setLinkDescription("")
            setIsLinkDialogOpen(false)
            debug.success('FILE_MANAGER', 'Link saved, dialog closed')
            
            // Then refresh
            await fetchFiles()
        } catch (error: any) {
            console.error('Error adding link:', error)
            debug.error('FILE_MANAGER', 'Add link error', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
            })
            const msg =
                error?.message?.includes('row-level security')
                    ? 'You do not have permissions to add links. Ask an admin or project manager.'
                    : error?.message || 'Failed to add link'
            alert(msg)
        } finally {
            setLinkSubmitting(false)
            debug.log('FILE_MANAGER', 'Add link end')
        }
    }

    async function handleUpdateDriveFolder() {
        const trimmed = newDriveFolderUrl.trim()
        if (!trimmed || savingDrive) return

        const supabase = createClient()
        setSavingDrive(true)

        try {
            const { error } = await supabase
                .from('projects')
                .update({ drive_folder_url: trimmed })
                .eq('id', projectId)

            if (error) throw error

            setIsDriveFolderDialogOpen(false)
            onDriveFolderUpdate?.(trimmed)
        } catch (error: any) {
            console.error('Error updating drive folder:', error)
            alert(error.message || 'Failed to update drive folder')
        } finally {
            setSavingDrive(false)
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

            fetchFiles()
        } catch (error: any) {
            console.error('Error deleting file:', error)
            alert(error.message || 'Failed to delete file')
        }
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
            <div className="flex gap-2">
                <Button onClick={() => { debug.log('FILE_MANAGER', 'Open upload dialog'); setIsUploadDialogOpen(true) }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                </Button>
                <Button variant="outline" onClick={() => { debug.log('FILE_MANAGER', 'Open add link dialog'); setIsLinkDialogOpen(true) }}>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Add Drive Link
                </Button>
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
                                            {getFileIcon(file.file_type)}
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
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
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
                                Upload
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Drive Link Dialog */}
            <Dialog open={isLinkDialogOpen} onOpenChange={(open) => { setIsLinkDialogOpen(open); if (!open) debug.log('FILE_MANAGER', 'Add link dialog closed'); }}>
                <DialogContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddLink(); }}>
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
                            <Button type="submit" disabled={!linkUrl || !linkName || linkSubmitting}>
                                {linkSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Link
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
                            <Button type="submit" disabled={!newDriveFolderUrl || savingDrive}>
                                {savingDrive && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
