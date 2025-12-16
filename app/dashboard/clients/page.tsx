"use client"

import { useState, useEffect } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Search, Mail, Phone, MapPin, Building2, Loader2, Copy, CheckCircle2, Eye, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Client, Project, Invoice, ServiceType } from "@/types"
import { SERVICE_TYPES } from "@/types"
import { createClientAccount } from "@/app/actions/create-client"
import { deleteClient } from "@/app/actions/delete-client"
import { Badge } from "@/components/ui/badge"
import { debug } from "@/lib/debug"

interface ClientWithDetails extends Client {
  projects?: Project[]
  invoices?: Invoice[]
  services?: ServiceType[]
  revenue_by_service?: Record<ServiceType, number>
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState({ email: "", password: "" })
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ clientId: string; clientName: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  })

  // Fetch clients
  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    const supabase = createClient()
    setLoading(true)

    try {
      console.log('Fetching clients...')
      debug.log('CLIENTS', 'Fetching clients...')

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
        debug.error('CLIENTS', 'Fetch error', { message: clientsError.message, code: clientsError.code })
        throw clientsError
      }

      console.log('Clients fetched:', clientsData?.length)
      debug.success('CLIENTS', 'Clients fetched', { count: clientsData?.length })

      // Fetch projects for each client
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
      }

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid')

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError)
      }

      // Enhance client data with projects, services, and revenue
      const enhancedClients: ClientWithDetails[] = (clientsData || []).map(client => {
        const clientProjects = projectsData?.filter(p => p.client_id === client.id) || []
        const clientInvoices = invoicesData?.filter(inv => inv.client_id === client.id) || []

        // Get unique services this client uses
        const services = [...new Set(clientProjects.map(p => p.service_type))] as ServiceType[]

        // Calculate revenue by service
        const revenueByService: Record<ServiceType, number> = {} as Record<ServiceType, number>
        clientProjects.forEach(project => {
          const projectRevenue = clientInvoices
            .filter(inv => inv.project_id === project.id)
            .reduce((sum, inv) => sum + (inv.total || 0), 0)

          const serviceType = project.service_type as ServiceType
          revenueByService[serviceType] = (revenueByService[serviceType] || 0) + projectRevenue
        })

        return {
          ...client,
          projects: clientProjects,
          invoices: clientInvoices,
          services,
          revenue_by_service: revenueByService,
        }
      })

      console.log('Enhanced clients:', enhancedClients.length)
      setClients(enhancedClients)
    } catch (error) {
      console.error('Error fetching clients:', error)
      alert('Failed to load clients. Please check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)

    try {
      debug.log('CLIENTS', 'Adding client', formData)

      // Call server action to create client account
      let result
      try {
        result = await createClientAccount(formData)
      } catch (callError: any) {
        debug.error('CLIENTS', 'Server action call failed', { error: callError?.message })
        throw new Error(`Server action failed: ${callError?.message || String(callError)}`)
      }

      debug.log('CLIENTS', 'Add client result', result)

      if (!result.success) {
        debug.error('CLIENTS', 'Failed to add client', result.error)
        throw new Error(result.error)
      }

      debug.success('CLIENTS', 'Client created successfully', { email: result.credentials?.email })

      // Store credentials to show to admin
      setGeneratedCredentials({
        email: result.credentials!.email,
        password: result.credentials!.password
      })

      // Close dialog and reset form BEFORE fetching data
      setIsDialogOpen(false)
      setFormData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
      })

      // Then refresh clients list
      debug.log('CLIENTS', 'Refreshing client list')
      await fetchClients()

      // Show credentials after
      debug.log('CLIENTS', 'Showing credentials modal')
      setShowCredentials(true)
    } catch (error: any) {
      console.error('Error adding client:', error)
      debug.error('CLIENTS', 'Submit error', { error: error?.message, details: String(error) })
      alert(error?.message || error?.toString() || 'Failed to add client')
    } finally {
      setSubmitting(false)
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesService = serviceFilter === "all" ||
      client.services?.includes(serviceFilter as ServiceType)

    return matchesSearch && matchesService
  })

  function openClientDetails(client: ClientWithDetails) {
    setSelectedClient(client)
    setIsDetailModalOpen(true)
  }

  async function handleDeleteClient(clientId: string) {
    setIsDeleting(true)
    try {
      debug.log('CLIENTS', 'Deleting client', { clientId })
      const result = await deleteClient(clientId)

      if (!result.success) {
        debug.error('CLIENTS', 'Failed to delete client', result.error)
        alert(result.error || 'Failed to delete client')
        return
      }

      debug.success('CLIENTS', 'Client deleted successfully')
      setDeleteConfirmation(null)
      setIsDetailModalOpen(false)
      setSelectedClient(null)
      await fetchClients()
      alert('Client deleted successfully')
    } catch (error: any) {
      console.error('Error deleting client:', error)
      debug.error('CLIENTS', 'Delete error', { error: error?.message })
      alert(error?.message || 'Failed to delete client')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your client relationships
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client details below to add them to your system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    placeholder="Acme Corporation"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact">Contact Person *</Label>
                  <Input
                    id="contact"
                    placeholder="John Doe"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@acme.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="123 Main St, City, State"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Adding...' : 'Add Client'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {Object.values(SERVICE_TYPES).map((service) => (
              <SelectItem key={service.value} value={service.value}>
                <span className="flex items-center gap-2">
                  <span>{service.icon}</span>
                  <span>{service.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started by adding your first client</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="grid gap-4 md:hidden">
            {filteredClients.map((client) => (
              <Card key={client.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openClientDetails(client)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(client.company_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{client.company_name}</CardTitle>
                        <CardDescription className="text-sm">{client.contact_person}</CardDescription>
                      </div>
                    </div>
                    <StatusBadge status={client.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {/* Services Used */}
                  {client.services && client.services.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {client.services.map((service) => {
                        const config = SERVICE_TYPES[service]
                        return (
                          <Badge key={service} className={`${config.bgColor} ${config.textColor}`}>
                            <span className="mr-1">{config.icon}</span>
                            {config.label}
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Projects</p>
                      <p className="font-medium">{client.projects?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium">₹{(client.invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>All Clients</CardTitle>
              <CardDescription>
                A list of all your clients including their contact information and project stats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer" onClick={() => openClientDetails(client)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(client.company_name)}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{client.company_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{client.contact_person}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.services && client.services.length > 0 ? (
                            client.services.slice(0, 2).map((service) => {
                              const config = SERVICE_TYPES[service]
                              return (
                                <Badge key={service} variant="outline" className="text-xs">
                                  <span className="mr-1">{config.icon}</span>
                                </Badge>
                              )
                            })
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          {client.services && client.services.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{client.services.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{client.email}</TableCell>
                      <TableCell>{client.projects?.length || 0}</TableCell>
                      <TableCell>₹{(client.invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusBadge status={client.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openClientDetails(client)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmation({ clientId: client.id, clientName: client.company_name })
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Client Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{getInitials(selectedClient.company_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl">{selectedClient.company_name}</DialogTitle>
                      <DialogDescription>{selectedClient.contact_person}</DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmation({ clientId: selectedClient.id, clientName: selectedClient.company_name })}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Contact Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.email}</span>
                      </div>
                      {selectedClient.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedClient.phone}</span>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedClient.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Projects</p>
                        <p className="text-2xl font-bold">{selectedClient.projects?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">
                          ₹{(selectedClient.invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services */}
                {selectedClient.services && selectedClient.services.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Services Engaged</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {selectedClient.services.map((service) => {
                        const config = SERVICE_TYPES[service]
                        const revenue = selectedClient.revenue_by_service?.[service] || 0
                        const projectCount = selectedClient.projects?.filter(p => p.service_type === service).length || 0

                        return (
                          <Card key={service} className={`border-2 ${config.borderColor}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{config.icon}</span>
                                <h4 className={`font-semibold ${config.textColor}`}>{config.label}</h4>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Projects</span>
                                  <span className="font-semibold">{projectCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Revenue</span>
                                  <span className="font-semibold">${revenue.toLocaleString()}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Projects */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Projects</h3>
                    <Badge variant="outline">{selectedClient.projects?.length || 0} total</Badge>
                  </div>
                  {selectedClient.projects && selectedClient.projects.length > 0 ? (
                    <div className="space-y-2">
                      {selectedClient.projects.map((project) => {
                        const config = SERVICE_TYPES[project.service_type]
                        return (
                          <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{config.icon}</span>
                              <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-sm text-muted-foreground">{config.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {project.budget && (
                                <span className="text-sm font-medium">${project.budget.toLocaleString()}</span>
                              )}
                              <StatusBadge status={project.status} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No projects yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Client Account Created
            </DialogTitle>
            <DialogDescription>
              Share these login credentials with the client. They won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email (Login ID)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedCredentials.email}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedCredentials.email, 'email')}
                >
                  {copiedField === 'email' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedCredentials.password}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                >
                  {copiedField === 'password' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Please save these credentials and share them with the client.
                The client should change their password after first login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCredentials(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmation?.clientName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This will delete the client account, all associated projects, invoices, and files.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmation(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteConfirmation && handleDeleteClient(deleteConfirmation.clientId)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}

