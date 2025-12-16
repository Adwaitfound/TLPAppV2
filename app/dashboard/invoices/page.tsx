"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Eye, FileText, Loader2, Plus, Trash2, Download } from "lucide-react"
import type { Client, Project } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { uploadInvoiceFile } from "@/app/actions/upload-invoice"
import { fetchInvoicesData, updateInvoiceStatus, deleteInvoice, getSignedInvoiceUrl } from "@/app/actions/invoice-operations"

interface Invoice {
    id: string
    invoice_number: string
    client_id: string
    project_id?: string
    invoice_file_url: string
    created_at: string
    status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
    clients?: { company_name: string }
    projects?: { name: string }
}

type StatusKey = Invoice["status"]

const statusConfig: Record<StatusKey, { label: string; variant: "secondary" | "default" | "destructive" }> = {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    paid: { label: "Paid", variant: "default" },
    overdue: { label: "Overdue", variant: "destructive" },
    cancelled: { label: "Cancelled", variant: "secondary" },
}

export default function InvoicesPage() {
    const { user, loading: authLoading } = useAuth()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const isSubmittingRef = useRef(false)
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [selectedClientId, setSelectedClientId] = useState("")
    const [selectedProjectId, setSelectedProjectId] = useState("")
    const [invoiceNumber, setInvoiceNumber] = useState("")

    const isAdwait = user?.email === "adwait@thelostproject.in"

    function showToast(message: string, type: "success" | "error" = "success") {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ message, type })
        toastTimerRef.current = setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        if (authLoading) return
        if (!isAdwait) {
            setLoading(false)
            return
        }
        void fetchData()
    }, [authLoading, isAdwait])

    const filteredProjects = projects.filter(project => !selectedClientId || project.client_id === selectedClientId)

    async function openSignedUrl(fileUrl: string, download?: boolean) {
        const result = await getSignedInvoiceUrl(fileUrl)
        if (result.error || !result.signedUrl) {
            showToast(result.error || "Unable to generate signed URL", "error")
            return
        }
        if (download) {
            const a = document.createElement("a")
            a.href = result.signedUrl
            a.download = "invoice.pdf"
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            showToast("Download started", "success")
        } else {
            window.open(result.signedUrl, "_blank")
            showToast("Opening invoice", "success")
        }
    }

    async function fetchData() {
        setLoading(true)
        try {
            const result = await fetchInvoicesData()
            if (result.error) {
                console.error("Fetch error:", result.error)
                throw new Error(result.error)
            }
            setInvoices(result.invoices || [])
            setClients(result.clients || [])
            setProjects(result.projects || [])
        } catch (error: any) {
            console.error("Error loading invoices:", error)
            showToast(error.message || "Failed to load invoices", "error")
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!isAdwait) {
            alert("Access restricted to adwait@thelostproject.in")
            return
        }

        if (isSubmittingRef.current) return
        if (!selectedFile) {
            alert("Please select an invoice PDF to upload")
            return
        }
        if (!selectedClientId || !invoiceNumber.trim()) {
            alert("Please fill in all required fields")
            return
        }
        if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
            alert("Please upload a PDF file")
            return
        }

        isSubmittingRef.current = true
        setSubmitting(true)
        const supabase = createClient()

        try {
            // Upload file via server action
            const formData = new FormData()
            formData.append("file", selectedFile)
            formData.append("invoiceNumber", invoiceNumber)

            const uploadResult = await uploadInvoiceFile(formData)
            if (!uploadResult.success || uploadResult.error) {
                throw new Error(uploadResult.error || "Upload failed")
            }

            const { publicUrl } = uploadResult

            const today = new Date().toISOString().split("T")[0]
            const { data, error } = await supabase
                .from("invoices")
                .insert({
                    client_id: selectedClientId,
                    project_id: selectedProjectId || null,
                    invoice_number: invoiceNumber,
                    invoice_file_url: publicUrl,
                    issue_date: today,
                    due_date: today,
                    status: "draft",
                })
                .select("*, clients(company_name), projects(name)")
                .single()

            if (error) {
                console.error("DB insert error details:", error)
                throw error
            }
            if (data) setInvoices(prev => [data, ...prev])

            showToast("Invoice uploaded", "success")

            setIsDialogOpen(false)
            setSelectedFile(null)
            setSelectedClientId("")
            setSelectedProjectId("")
            setInvoiceNumber("")
        } catch (error: any) {
            console.error("Error uploading invoice:", error)
            showToast(error.message || "Failed to upload invoice", "error")
        } finally {
            setSubmitting(false)
            isSubmittingRef.current = false
        }
    }

    async function handleDelete(invoiceId: string, fileUrl: string) {
        if (!confirm("Are you sure you want to delete this invoice?")) return

        try {
            const result = await deleteInvoice(invoiceId, fileUrl)
            if (result.error) {
                throw new Error(result.error)
            }
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
            showToast("Invoice deleted", "success")
        } catch (error: any) {
            console.error("Error deleting invoice:", error)
            showToast(error.message || "Failed to delete invoice", "error")
        }
    }

    if (authLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        )
    }

    if (!isAdwait) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="max-w-md space-y-2 text-center">
                    <h2 className="text-xl font-semibold">Access restricted</h2>
                    <p className="text-muted-foreground text-sm">Only adwait@thelostproject.in can manage invoices here.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {toast ? (
                <div
                    className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg text-sm text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
                    role="status"
                >
                    {toast.message}
                </div>
            ) : null}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
                    <p className="text-muted-foreground">Upload and manage client invoices</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Invoice
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{invoices.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Invoices</CardTitle>
                    <CardDescription>View and manage uploaded invoices</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="py-12 text-center">
                            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No invoices uploaded yet</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                        <TableCell>{invoice.clients?.company_name}</TableCell>
                                        <TableCell>
                                            {invoice.projects?.name || <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={invoice.status}
                                                onValueChange={(newStatus) =>
                                                    updateInvoiceStatus(invoice.id, newStatus).then(result => {
                                                        if (result.error) {
                                                            showToast(result.error, "error")
                                                        } else if (result.data) {
                                                            setInvoices(prev =>
                                                                prev.map(inv =>
                                                                    inv.id === invoice.id ? result.data : inv
                                                                )
                                                            )
                                                            showToast("Status updated", "success")
                                                        }
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-auto border-0 bg-transparent">
                                                    <Badge variant={statusConfig[invoice.status].variant}>
                                                        {statusConfig[invoice.status].label}
                                                    </Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Draft</SelectItem>
                                                    <SelectItem value="sent">Sent</SelectItem>
                                                    <SelectItem value="paid">Paid</SelectItem>
                                                    <SelectItem value="overdue">Overdue</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openSignedUrl(invoice.invoice_file_url)}
                                                    title="View PDF"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openSignedUrl(invoice.invoice_file_url, true)}
                                                    title="Download PDF"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(invoice.id, invoice.invoice_file_url)}
                                                    title="Delete invoice"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={isDialogOpen}
                onOpenChange={open => {
                    if (!open) {
                        setSelectedFile(null)
                        setSelectedClientId("")
                        setSelectedProjectId("")
                        setInvoiceNumber("")
                        setSubmitting(false)
                        isSubmittingRef.current = false
                    }
                    setIsDialogOpen(open)
                }}
            >
                <DialogContent className="max-w-md">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Upload Invoice</DialogTitle>
                            <DialogDescription>Upload an invoice PDF and select the client and project</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Invoice PDF *</Label>
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                    className="mt-1"
                                    required
                                />
                                {selectedFile && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Invoice Number *</Label>
                                <Input
                                    value={invoiceNumber}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                    className="mt-1"
                                    placeholder="INV-2024-001"
                                    required
                                />
                            </div>

                            <div>
                                <Label>Client *</Label>
                                <Select
                                    value={selectedClientId}
                                    onValueChange={value => {
                                        setSelectedClientId(value)
                                        setSelectedProjectId("")
                                    }}
                                    required
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.company_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Project (Optional)</Label>
                                <Select
                                    value={selectedProjectId}
                                    onValueChange={setSelectedProjectId}
                                    disabled={!selectedClientId}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue
                                            placeholder={selectedClientId ? "Select project" : "Select client first"}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredProjects.map(project => (
                                            <SelectItem key={project.id} value={project.id}>
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting || !selectedFile}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitting ? "Uploading..." : "Upload Invoice"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
