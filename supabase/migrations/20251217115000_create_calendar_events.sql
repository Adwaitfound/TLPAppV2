-- Calendar events for content planning (initial create)
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  event_date date not null,
  title text not null,
  copy text,
  platform text check (platform in ('instagram','facebook','youtube','linkedin')),
  content_type text check (content_type in ('reel','carousel','story','static','video')),
  status text check (status in ('idea','editing','review','scheduled','published')) default 'idea',
  ig_link text,
  yt_link text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  attachments jsonb default '[]'::jsonb
);

alter table public.calendar_events enable row level security;

-- Basic policies: authenticated users allowed (adjust as needed)
drop policy if exists "calendar_events read" on public.calendar_events;
create policy "calendar_events read" on public.calendar_events
  for select to authenticated using (true);

drop policy if exists "calendar_events insert" on public.calendar_events;
create policy "calendar_events insert" on public.calendar_events
  for insert to authenticated with check (true);

drop policy if exists "calendar_events update" on public.calendar_events;
create policy "calendar_events update" on public.calendar_events
  for update to authenticated using (true) with check (true);

drop policy if exists "calendar_events delete" on public.calendar_events;
create policy "calendar_events delete" on public.calendar_events
  for delete to authenticated using (true);

-- Helpful index
create index if not exists calendar_events_project_date_idx on public.calendar_events(project_id, event_date);
