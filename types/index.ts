export type UserRole = 'admin' | 'project_manager' | 'client'

export type ProjectStatus = 'planning' | 'in_progress' | 'in_review' | 'completed' | 'cancelled'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type ClientStatus = 'active' | 'inactive'

export type CommentStatus = 'pending' | 'resolved'

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  company_name?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  total_projects: number
  total_revenue: number
  status: ClientStatus
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description: string
  status: ProjectStatus
  budget: number
  start_date: string
  deadline: string
  progress_percentage: number
  thumbnail_url?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  version: number
  uploaded_by: string
  created_at: string
}

export interface ProjectComment {
  id: string
  project_id: string
  file_id?: string
  user_id: string
  comment_text: string
  timestamp_seconds?: number
  status: CommentStatus
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  project_id: string
  client_id: string
  issue_date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  status: InvoiceStatus
  paid_at?: string
  created_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Milestone {
  id: string
  project_id: string
  title: string
  description: string
  due_date: string
  status: MilestoneStatus
  completed_at?: string
  created_at: string
}
