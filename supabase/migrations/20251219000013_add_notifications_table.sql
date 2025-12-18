-- Notifications table for in-app alerts
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  message text not null,
  metadata jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read on notifications(user_id, read);
create index if not exists idx_notifications_created on notifications(created_at desc);