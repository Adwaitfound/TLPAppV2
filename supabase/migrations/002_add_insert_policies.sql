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
