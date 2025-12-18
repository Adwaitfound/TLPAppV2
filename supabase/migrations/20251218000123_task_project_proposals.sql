-- Add fields to allow employees to propose a project when creating a task
ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS proposed_project_name TEXT,
  ADD COLUMN IF NOT EXISTS proposed_project_status VARCHAR(20) DEFAULT 'pending' CHECK (proposed_project_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS proposed_project_notes TEXT,
  ADD COLUMN IF NOT EXISTS proposed_project_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_project_reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employee_tasks_proposed_status ON employee_tasks(proposed_project_status);
