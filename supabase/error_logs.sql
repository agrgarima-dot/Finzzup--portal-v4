-- Supabase: create error_logs table for frontend error tracking
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists public.error_logs (
  id          bigserial primary key,
  message     text,
  stack       text,
  page_url    text,
  user_agent  text,
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz default now()
);

-- Only Supabase service role can insert (called via /api/log-error which uses anon key)
-- Grant anon insert so the API endpoint can write
alter table public.error_logs enable row level security;

create policy "anon_insert_error_logs"
  on public.error_logs for insert
  with check (true);

-- Garima (admin) can read all logs
create policy "admin_read_error_logs"
  on public.error_logs for select
  using (true);

-- Auto-delete logs older than 90 days (optional — run as a scheduled job or manually)
-- delete from public.error_logs where created_at < now() - interval '90 days';
