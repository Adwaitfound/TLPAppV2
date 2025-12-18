-- Create project_comments table
create table if not exists project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete set null,
  text text,
  voice_url text,
  assigned_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_project_comments_project_id on project_comments(project_id);
create index if not exists idx_project_comments_author_user_id on project_comments(author_user_id);

-- RLS
alter table project_comments enable row level security;

-- Allow read to project stakeholders (client, team, admin)
create policy if not exists "Read comments for project stakeholders" on project_comments
  for select
  using (
    -- Admins can read everything
    (EXISTS (select 1 from users u where u.id = auth.uid() and u.role = 'admin'))
    OR
    -- Employees/PMs can read when they are on the project team
    (EXISTS (
      select 1 from project_team pt
      where pt.project_id = project_comments.project_id and pt.user_id = auth.uid()
    ))
    OR
    -- Clients can read when the project belongs to their client record
    (EXISTS (
      select 1 from projects p
      join clients c on p.client_id = c.id
      where p.id = project_comments.project_id and c.user_id = auth.uid()
    ))
  );

-- Allow insert by clients (owner) and employees on the project team
create policy if not exists "Insert comments by client or team" on project_comments
  for insert
  to authenticated
  with check (
    (EXISTS (
      select 1 from projects p
      join clients c on p.client_id = c.id
      where p.id = project_comments.project_id and c.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      select 1 from project_team pt
      where pt.project_id = project_comments.project_id and pt.user_id = auth.uid()
    ))
  );

-- Allow update of assigned_user_id by admins only
create policy if not exists "Admin can assign comment" on project_comments
  for update
  using (EXISTS (select 1 from users u where u.id = auth.uid() and u.role = 'admin'))
  with check (true);
