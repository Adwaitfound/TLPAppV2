-- ===== CLEAN DATABASE SETUP - Run this in Supabase SQL Editor =====
-- This consolidates all migrations without conflicts

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS sub_project_updates CASCADE;
DROP TABLE IF EXISTS sub_project_comments CASCADE;
DROP TABLE IF EXISTS sub_projects CASCADE;
DROP TABLE IF EXISTS project_team CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS project_comments CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS client_services CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS milestone_status CASCADE;
DROP TYPE IF EXISTS comment_status CASCADE;
DROP TYPE IF EXISTS client_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'client');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'in_review', 'completed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE client_status AS ENUM ('active', 'inactive');
CREATE TYPE comment_status AS ENUM ('pending', 'resolved');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE service_type AS ENUM ('social_media', 'video_production', 'design_branding');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'client',
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_projects INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    status client_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table (with all columns including drive_folder_url and service_type)
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    service_type service_type NOT NULL DEFAULT 'video_production',
    budget DECIMAL(15, 2),
    start_date DATE,
    deadline DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    thumbnail_url TEXT,
    drive_folder_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client services table
CREATE TABLE client_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, service_type)
);

-- Project files table (final schema from migration 006)
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_category TEXT NOT NULL,
    storage_type TEXT NOT NULL,
    file_url TEXT,
    file_size BIGINT,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Project comments table
CREATE TABLE project_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    timestamp_seconds DECIMAL(10, 2),
    status comment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    tax DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    status invoice_status DEFAULT 'draft',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL
);

-- Milestones table
CREATE TABLE milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status milestone_status DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project team table
CREATE TABLE project_team (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    assigned_by UUID REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

-- Sub-projects table
CREATE TABLE sub_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    assigned_to UUID REFERENCES users(id),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    due_date DATE,
    video_url TEXT,
    video_thumbnail_url TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-project comments table
CREATE TABLE sub_project_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sub-project updates table
CREATE TABLE sub_project_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    update_type TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_service_type ON projects(service_type);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_client_services_client_id ON client_services(client_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_category ON project_files(file_category);
CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_project_team_project_id ON project_team(project_id);
CREATE INDEX idx_project_team_user_id ON project_team(user_id);
CREATE INDEX idx_sub_projects_parent ON sub_projects(parent_project_id);
CREATE INDEX idx_sub_projects_assigned_to ON sub_projects(assigned_to);
CREATE INDEX idx_sub_projects_status ON sub_projects(status);
CREATE INDEX idx_sub_project_comments_sub_project_id ON sub_project_comments(sub_project_id);
CREATE INDEX idx_sub_project_updates_sub_project_id ON sub_project_updates(sub_project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sub_projects_updated_at BEFORE UPDATE ON sub_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_project_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow user creation during signup" ON users FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated');

-- RLS Policies for clients
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert client records" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Authenticated users can view projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert projects" ON projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins and PMs can update projects" ON projects FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'project_manager')))
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'project_manager')));

-- RLS Policies for client_services
CREATE POLICY "Users can view client services" ON client_services FOR SELECT USING (true);
CREATE POLICY "Admins can manage client services" ON client_services FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- RLS Policies for project_files
CREATE POLICY "Admins and PMs can view project files" ON project_files FOR SELECT
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'project_manager')));
CREATE POLICY "Admins and PMs can insert project files" ON project_files FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'project_manager')));
CREATE POLICY "Admins and PMs can update project files" ON project_files FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'project_manager')));
CREATE POLICY "Admins and PMs can delete project files" ON project_files FOR DELETE
    USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'project_manager')));
CREATE POLICY "Clients can view their project files" ON project_files FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p JOIN clients c ON p.client_id = c.id
        WHERE p.id = project_files.project_id AND c.user_id = auth.uid()
    ));

-- RLS Policies for project_comments
CREATE POLICY "Authenticated users can view comments" ON project_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert comments" ON project_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert invoices" ON invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for invoice_items
CREATE POLICY "Authenticated users can insert invoice items" ON invoice_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for milestones
CREATE POLICY "Authenticated users can view milestones" ON milestones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert milestones" ON milestones FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for project_team
CREATE POLICY "Authenticated users can view project team" ON project_team FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage project team" ON project_team FOR ALL
    USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- RLS Policies for sub_projects
CREATE POLICY "Authenticated users can view sub_projects" ON sub_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sub_projects" ON sub_projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update sub_projects" ON sub_projects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete sub_projects" ON sub_projects FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for sub_project_comments
CREATE POLICY "Authenticated users can view sub_project_comments" ON sub_project_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sub_project_comments" ON sub_project_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for sub_project_updates
CREATE POLICY "Authenticated users can view sub_project_updates" ON sub_project_updates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert sub_project_updates" ON sub_project_updates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
