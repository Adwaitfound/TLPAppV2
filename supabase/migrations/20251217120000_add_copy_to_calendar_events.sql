-- Add copy/caption field for calendar events (idempotent)
alter table if exists public.calendar_events
  add column if not exists copy text;
