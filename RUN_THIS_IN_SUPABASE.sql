-- ===== supabase/migrations/001_initial_schema.sql =====
-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS project_comments CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Projects table
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    budget DECIMAL(15, 2),
    start_date DATE,
    deadline DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    thumbnail_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project files table
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Create indexes for better query performance
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be customized based on requirements)
-- Users can read all users
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);

-- Projects are viewable by authenticated users
CREATE POLICY "Authenticated users can view projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');

-- Similar policies for other tables
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view project files" ON project_files FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view comments" ON project_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view milestones" ON milestones FOR SELECT USING (auth.role() = 'authenticated');

-- ===== supabase/migrations/002_add_insert_policies.sql =====
-- Add INSERT policies to allow user registration

-- Allow users to insert their own user record during signup
CREATE POLICY "Users can insert own record" ON users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to insert client records for themselves
CREATE POLICY "Users can insert client records" ON clients 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert projects
CREATE POLICY "Authenticated users can insert projects" ON projects 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert project files
CREATE POLICY "Authenticated users can insert project files" ON project_files 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert comments
CREATE POLICY "Authenticated users can insert comments" ON project_comments 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert invoices
CREATE POLICY "Authenticated users can insert invoices" ON invoices 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert invoice items
CREATE POLICY "Authenticated users can insert invoice items" ON invoice_items 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert milestones
CREATE POLICY "Authenticated users can insert milestones" ON milestones 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- ===== supabase/migrations/003_fix_user_insert_policy.sql =====
-- Fix users table INSERT policy for signup
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert own record" ON users;

-- Create a more permissive policy that allows signup
-- This allows inserting during signup when auth.uid() matches the id being inserted
CREATE POLICY "Allow user creation during signup" ON users 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'authenticated'
  );

-- ===== supabase/migrations/004_add_clients_user_id_unique.sql =====
-- Add unique constraint to clients table user_id
ALTER TABLE clients ADD CONSTRAINT clients_user_id_unique UNIQUE (user_id);

-- ===== supabase/migrations/005_add_service_types.sql =====
-- Add service type to projects
DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('social_media', 'video_production', 'design_branding');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add service_type column to projects table
DO $$ BEGIN
    ALTER TABLE projects ADD COLUMN service_type service_type NOT NULL DEFAULT 'video_production';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create a table to track which services each client uses
CREATE TABLE IF NOT EXISTS client_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, service_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_service_type ON projects(service_type);
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON client_services(client_id);

-- Add RLS policies for client_services
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view client services" ON client_services;
CREATE POLICY "Users can view client services" 
    ON client_services FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Admins can manage client services" ON client_services;
CREATE POLICY "Admins can manage client services" 
    ON client_services FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- ===== supabase/migrations/006_add_project_files.sql =====
-- Add Google Drive folder link to projects
DO $$ BEGIN
    ALTER TABLE projects ADD COLUMN drive_folder_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Drop existing table if it exists to start fresh
DROP TABLE IF EXISTS project_files CASCADE;

-- Create project_files table for tracking uploaded files and Drive links
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'document', 'image', 'video', 'pdf', 'other'
    file_category TEXT NOT NULL, -- 'pre_production', 'production', 'post_production', 'deliverables', 'other'
    storage_type TEXT NOT NULL, -- 'supabase' or 'google_drive'
    file_url TEXT, -- Supabase storage path or Google Drive link
    file_size BIGINT, -- Size in bytes (for Supabase uploads)
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_category ON project_files(file_category);

-- Enable RLS
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_files
DROP POLICY IF EXISTS "Allow admins and project managers to view project files" ON project_files;
CREATE POLICY "Allow admins and project managers to view project files"
    ON project_files FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Allow admins and project managers to insert project files" ON project_files;
CREATE POLICY "Allow admins and project managers to insert project files"
    ON project_files FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Allow admins and project managers to update project files" ON project_files;
CREATE POLICY "Allow admins and project managers to update project files"
    ON project_files FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Allow admins and project managers to delete project files" ON project_files;
CREATE POLICY "Allow admins and project managers to delete project files"
    ON project_files FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

-- Allow clients to view files from their own projects
DROP POLICY IF EXISTS "Allow clients to view their project files" ON project_files;
CREATE POLICY "Allow clients to view their project files"
    ON project_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.id = project_files.project_id
            AND c.user_id = auth.uid()
        )
    );


-- ===== supabase/migrations/007_allow_project_updates.sql =====
-- Allow admins and project managers to update projects (for drive folder updates, etc.)
CREATE POLICY "Admins and PMs can update projects" ON projects
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('admin', 'project_manager')
        )
    );

-- ===== supabase/migrations/008_add_project_team.sql =====
-- Create project_team table for tracking team member assignments
CREATE TABLE IF NOT EXISTS project_team (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT, -- Optional role like 'lead', 'editor', 'designer', etc.
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    assigned_by UUID REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON project_team(user_id);

-- Enable RLS
ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to view project team" ON project_team;
CREATE POLICY "Allow all authenticated users to view project team"
    ON project_team FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage project team" ON project_team;
CREATE POLICY "Allow admins to manage project team"
    ON project_team FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- ===== supabase/migrations/009_add_sub_projects.sql =====
-- Create sub-projects table (tasks under a main project)
CREATE TABLE IF NOT EXISTS sub_projects (
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

-- Create sub-project comments table
CREATE TABLE IF NOT EXISTS sub_project_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sub-project updates/activity table
CREATE TABLE IF NOT EXISTS sub_project_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sub_project_id UUID NOT NULL REFERENCES sub_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    update_text TEXT NOT NULL,
    update_type TEXT DEFAULT 'general', -- general, status_change, progress_update, etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_projects_parent ON sub_projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_sub_projects_assigned_to ON sub_projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sub_projects_status ON sub_projects(status);
CREATE INDEX IF NOT EXISTS idx_sub_project_comments_sub_project_id ON sub_project_comments(sub_project_id);
CREATE INDEX IF NOT EXISTS idx_sub_project_updates_sub_project_id ON sub_project_updates(sub_project_id);

-- Add updated_at trigger for sub_projects
CREATE TRIGGER update_sub_projects_updated_at BEFORE UPDATE ON sub_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE sub_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_project_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view sub_projects" ON sub_projects;
CREATE POLICY "Authenticated users can view sub_projects" ON sub_projects FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can insert sub_projects" ON sub_projects;
CREATE POLICY "Authenticated users can insert sub_projects" ON sub_projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can update sub_projects" ON sub_projects;
CREATE POLICY "Authenticated users can update sub_projects" ON sub_projects FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can delete sub_projects" ON sub_projects;
CREATE POLICY "Authenticated users can delete sub_projects" ON sub_projects FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view sub_project_comments" ON sub_project_comments;
CREATE POLICY "Authenticated users can view sub_project_comments" ON sub_project_comments FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can insert sub_project_comments" ON sub_project_comments;
CREATE POLICY "Authenticated users can insert sub_project_comments" ON sub_project_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view sub_project_updates" ON sub_project_updates;
CREATE POLICY "Authenticated users can view sub_project_updates" ON sub_project_updates FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can insert sub_project_updates" ON sub_project_updates;
CREATE POLICY "Authenticated users can insert sub_project_updates" ON sub_project_updates FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ===== supabase/migrations/20251215035755_create_employee_user.sql =====
-- Insert employee user into public.users table
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the auth user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'employee@thelostproject.in';
    
    IF v_user_id IS NOT NULL THEN
        -- Insert into users table
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (
            v_user_id,
            'employee@thelostproject.in',
            'Employee User',
            'project_manager'
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    ELSE
        RAISE EXCEPTION 'Auth user not found for email: employee@thelostproject.in';
    END IF;
END $$;

-- Intentionally empty. Sample data script removed to prevent inserting mock data.
    ('inv11111-1111-1111-1111-111111111111', 'Color grading and sound design', 1, 6000, 6000),
    ('inv11111-1111-1111-1111-111111111111', 'Revisions and final delivery', 1, 3000, 3000),
    
    -- INV-2024-008 items
    ('inv88888-8888-8888-8888-888888888888', 'Video interviews (5 customers)', 5, 3000, 15000),
    ('inv88888-8888-8888-8888-888888888888', 'Editing and post-production', 1, 20000, 20000),
    ('inv88888-8888-8888-8888-888888888888', 'Motion graphics and titles', 1, 10000, 10000),
    ('inv88888-8888-8888-8888-888888888888', 'Music licensing and sound mixing', 1, 5000, 5000)
ON CONFLICT DO NOTHING;

-- Add sample milestones
INSERT INTO milestones (id, project_id, title, description, due_date, status, completed_at, created_at)
VALUES 
    -- Completed project milestones
    ('m1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Script Approval', 'Final script approved by client', '2024-09-15', 'completed', '2024-09-14', NOW() - INTERVAL '4 months'),
    ('m2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Production Complete', 'All filming completed', '2024-09-30', 'completed', '2024-09-29', NOW() - INTERVAL '4 months'),
    
    -- Active project milestones
    ('m3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Episodes 1-5 Delivered', 'First half of training series completed', '2024-12-20', 'completed', '2024-12-18', NOW() - INTERVAL '2 days'),
    ('m4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 'Episodes 6-10 First Draft', 'Second half initial edit', '2025-01-15', 'in_progress', NULL, NOW() - INTERVAL '1 month'),
    ('m5555555-5555-5555-5555-555555555555', 'a2222222-2222-2222-2222-222222222222', 'Final Delivery', 'All episodes finalized and delivered', '2025-02-15', 'pending', NULL, NOW() - INTERVAL '1 month'),
    
    ('m6666666-6666-6666-6666-666666666666', 'b3333333-3333-3333-3333-333333333333', 'First 3 Testimonials', 'Initial customer interviews completed', '2024-12-15', 'completed', '2024-12-14', NOW() - INTERVAL '3 days'),
    ('m7777777-7777-7777-7777-777777777777', 'b3333333-3333-3333-3333-333333333333', 'Remaining Interviews', 'Complete all customer interviews', '2025-01-10', 'in_progress', NULL, NOW() - INTERVAL '2 weeks'),
    ('m8888888-8888-8888-8888-888888888888', 'b3333333-3333-3333-3333-333333333333', 'Final Edit Approval', 'Client approval of final cuts', '2025-01-31', 'pending', NULL, NOW() - INTERVAL '2 weeks'),
    
    ('m9999999-9999-9999-9999-999999999999', 'b4444444-4444-4444-4444-444444444444', 'Rough Cut Review', 'Initial edit for client review', '2024-12-10', 'completed', '2024-12-09', NOW() - INTERVAL '1 week'),
    ('mAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'b4444444-4444-4444-4444-444444444444', 'Final Delivery', 'Approved final version delivered', '2024-12-30', 'in_progress', NULL, NOW() - INTERVAL '1 month'),
    
    ('mBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', 'c2222222-2222-2222-2222-222222222222', 'Concept Approval', 'Creative concept approved', '2024-12-18', 'completed', '2024-12-17', NOW() - INTERVAL '2 days'),
    ('mCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', 'c2222222-2222-2222-2222-222222222222', 'Production Day', 'All video footage captured', '2024-12-28', 'pending', NULL, NOW() - INTERVAL '5 days'),
    ('mDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'c2222222-2222-2222-2222-222222222222', 'First Draft', 'Initial edit completed', '2025-01-10', 'pending', NULL, NOW() - INTERVAL '5 days'),
    ('mEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'c2222222-2222-2222-2222-222222222222', 'Final Delivery', 'Final approved videos delivered', '2025-01-25', 'pending', NULL, NOW() - INTERVAL '5 days'),
    
    ('mFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'd3333333-3333-3333-3333-333333333333', 'Animation Storyboard', 'Storyboard approved by client', '2024-12-05', 'completed', '2024-12-04', NOW() - INTERVAL '2 weeks'),
    ('mGGGGGGG-GGGG-GGGG-GGGG-GGGGGGGGGGGG', 'd3333333-3333-3333-3333-333333333333', 'Animation First Pass', 'Initial animation completed', '2024-12-20', 'completed', '2024-12-19', NOW() - INTERVAL '1 day'),
    ('mHHHHHHH-HHHH-HHHH-HHHH-HHHHHHHHHHHH', 'd3333333-3333-3333-3333-333333333333', 'Final Animation', 'Final animation with revisions', '2025-01-10', 'in_progress', NULL, NOW() - INTERVAL '3 weeks'),
    ('mIIIIIII-IIII-IIII-IIII-IIIIIIIIIIII', 'd3333333-3333-3333-3333-333333333333', 'Sound Design & Delivery', 'Complete sound design and deliver', '2025-01-15', 'pending', NULL, NOW() - INTERVAL '3 weeks'),
    
    ('mJJJJJJJ-JJJJ-JJJJ-JJJJ-JJJJJJJJJJJJ', 'e1111111-1111-1111-1111-111111111111', 'Module 1-3 Complete', 'First three training modules done', '2024-12-20', 'in_progress', NULL, NOW() - INTERVAL '2 weeks'),
    ('mKKKKKKK-KKKK-KKKK-KKKK-KKKKKKKKKKKK', 'e1111111-1111-1111-1111-111111111111', 'Module 4-6 Complete', 'Middle training modules done', '2025-01-20', 'pending', NULL, NOW() - INTERVAL '2 weeks'),
    ('mLLLLLLL-LLLL-LLLL-LLLL-LLLLLLLLLLLL', 'e1111111-1111-1111-1111-111111111111', 'All Modules Delivered', 'Complete training series', '2025-02-28', 'pending', NULL, NOW() - INTERVAL '2 weeks'),
    
    ('mMMMMMMM-MMMM-MMMM-MMMM-MMMMMMMMMMMM', 'f2222222-2222-2222-2222-222222222222', 'First Episode Edit', 'Initial BTS episode completed', '2024-12-01', 'completed', '2024-11-30', NOW() - INTERVAL '2 weeks'),
    ('mNNNNNNN-NNNN-NNNN-NNNN-NNNNNNNNNNNN', 'f2222222-2222-2222-2222-222222222222', 'Episodes 2-4 Draft', 'Middle episodes rough cut', '2024-12-25', 'in_progress', NULL, NOW() - INTERVAL '6 weeks'),
    ('mOOOOOOO-OOOO-OOOO-OOOO-OOOOOOOOOOOO', 'f2222222-2222-2222-2222-222222222222', 'Final Series Delivery', 'All BTS episodes delivered', '2025-01-20', 'pending', NULL, NOW() - INTERVAL '6 weeks')
ON CONFLICT (id) DO NOTHING;

-- Update client total_projects and total_revenue based on actual data
UPDATE clients c
SET 
    total_projects = (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id),
    total_revenue = (SELECT COALESCE(SUM(i.total), 0) FROM invoices i WHERE i.client_id = c.id AND i.status = 'paid');
