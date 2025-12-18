-- Add assigned_user_id to project_comments for assignment workflows
alter table project_comments
    add column if not exists assigned_user_id uuid references users(id) on delete set null;

create index if not exists idx_project_comments_assigned_user_id
    on project_comments(assigned_user_id);
