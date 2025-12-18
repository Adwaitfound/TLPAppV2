-- Add client approval fields to projects
alter table projects add column if not exists client_approved boolean not null default false;
alter table projects add column if not exists client_approved_at timestamptz;

-- Index for quick filtering
create index if not exists idx_projects_client_approved on projects(client_approved);
