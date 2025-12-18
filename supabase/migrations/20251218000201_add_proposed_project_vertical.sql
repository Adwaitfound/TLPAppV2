-- Add vertical field to proposed projects for better categorization
ALTER TABLE employee_tasks
  ADD COLUMN IF NOT EXISTS proposed_project_vertical VARCHAR(50) CHECK (proposed_project_vertical IN ('video_production', 'social_media', 'design_branding'));

-- Create index for filtering by vertical
CREATE INDEX IF NOT EXISTS idx_employee_tasks_proposed_vertical ON employee_tasks(proposed_project_vertical) WHERE proposed_project_name IS NOT NULL;
