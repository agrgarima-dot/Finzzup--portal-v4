-- Supabase: live figures, refreshed on a schedule
-- Run once in the SQL Editor (Dashboard → SQL Editor → New query)
--
-- Deliberately a separate table from report_data. report_data holds the
-- REVIEWED work — statements, commentary, action points — and is written only
-- when a Chartered Accountant publishes. This table holds facts that carry no
-- judgement and refresh on their own. Keeping them apart means a scheduled job
-- can never overwrite reviewed analysis, and reviewed analysis can never go
-- stale pretending to be live.

create table if not exists public.live_snapshots (
  client_id   uuid primary key references public.clients(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz default now(),
  error       text
);

alter table public.live_snapshots enable row level security;

-- Clients read their own figures through the portal's anon key, the same way
-- they read every other table here. Writes come only from the scheduled job,
-- which uses the service role key and bypasses these policies.
create policy "anon_read_live_snapshots"
  on public.live_snapshots for select
  using (true);
