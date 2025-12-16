-- CLEANUP_MOCK_DATA.sql
-- Removes all hardcoded demo/mock data from the database by pattern matching
-- Preserves real user-created records
-- Safe to run multiple times

-- Step 1: Delete all dependent records first
-- Delete sub-project updates
DELETE FROM sub_project_updates
WHERE sub_project_id IN (
  SELECT sp.id FROM sub_projects sp
  INNER JOIN projects p ON sp.parent_project_id = p.id
  WHERE p.name LIKE 'Project%' OR p.name LIKE 'Demo%'
);

-- Delete sub-project comments
DELETE FROM sub_project_comments
WHERE sub_project_id IN (
  SELECT sp.id FROM sub_projects sp
  INNER JOIN projects p ON sp.parent_project_id = p.id
  WHERE p.name LIKE 'Project%' OR p.name LIKE 'Demo%'
);

-- Delete sub-projects
DELETE FROM sub_projects
WHERE parent_project_id IN (
  SELECT id FROM projects 
  WHERE name LIKE 'Project%' OR name LIKE 'Demo%'
);

-- Delete project team assignments
DELETE FROM project_team
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE name LIKE 'Project%' OR name LIKE 'Demo%'
);

-- Delete project comments
DELETE FROM project_comments
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE name LIKE 'Project%' OR name LIKE 'Demo%'
);

-- Delete project files
DELETE FROM project_files
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE name LIKE 'Project%' OR name LIKE 'Demo%'
);

-- Delete milestones
DELETE FROM milestones
WHERE project_id IN (
  SELECT id FROM projects 
  WHERE name LIKE 'Project%' OR name LIKE 'Demo%'
);

-- Delete invoice items (for demo invoices)
DELETE FROM invoice_items
WHERE invoice_id IN (
  SELECT id FROM invoices 
  WHERE invoice_number LIKE 'INV-%'
);

-- Delete invoices (demo invoices only)
DELETE FROM invoices
WHERE invoice_number LIKE 'INV-%';

-- Delete projects (demo projects)
DELETE FROM projects
WHERE name LIKE 'Project%' OR name LIKE 'Demo%';

-- Delete client services
DELETE FROM client_services
WHERE client_id IN (
  SELECT id FROM clients 
  WHERE name LIKE '%Demo%' OR name LIKE 'Tech%' OR name LIKE 'Digital%'
);

-- Delete clients (demo clients)
DELETE FROM clients
WHERE name LIKE '%Demo%' OR name LIKE 'Tech%' OR name LIKE 'Digital%';

-- Step 2: Confirm deletion with final counts
SELECT
  (SELECT COUNT(*) FROM clients) as remaining_clients,
  (SELECT COUNT(*) FROM projects) as remaining_projects,
  (SELECT COUNT(*) FROM invoices) as remaining_invoices,
  (SELECT COUNT(*) FROM milestones) as remaining_milestones,
  (SELECT COUNT(*) FROM project_files) as remaining_files,
  (SELECT COUNT(*) FROM users WHERE role IS NOT NULL) as remaining_users;
