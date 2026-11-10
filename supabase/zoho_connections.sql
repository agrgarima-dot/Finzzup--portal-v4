-- Supabase: Zoho Books connections
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- SECURITY: zoho_connections holds refresh tokens, which are long-lived and
-- give read access to a client's books. Row level security is on and NO policy
-- is created, so the anon key — the one shipped in the browser bundle — can
-- neither read nor write these rows. Only the service role key can, and that
-- key lives in Vercel env vars and never reaches the browser.

create table if not exists public.zoho_connections (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  organization_id   text not null,         -- Zoho Books org these books belong to
  organization_name text,
  refresh_token     text not null,         -- long-lived; server-side only
  api_domain        text not null,         -- e.g. https://www.zohoapis.com
  accounts_server   text not null,         -- e.g. https://accounts.zoho.com
  location          text,                  -- 'us' | 'eu' | 'in' | 'sa' | ...
  connected_by      text,                  -- who authorised it
  last_sync_at      timestamptz,
  last_sync_error   text,
  created_at        timestamptz default now(),
  unique (client_id, organization_id)
);

alter table public.zoho_connections enable row level security;
-- No policies on purpose. See the note above.

-- Short-lived CSRF state for the authorisation round trip. A row is written
-- when the connect flow starts and deleted the moment it is redeemed, so a
-- replayed callback finds nothing and is rejected.
create table if not exists public.zoho_oauth_states (
  state       text primary key,
  client_id   uuid not null references public.clients(id) on delete cascade,
  created_at  timestamptz default now()
);

alter table public.zoho_oauth_states enable row level security;
-- No policies on purpose: written and read only with the service role key.

-- States are single-use, but an abandoned connect attempt leaves one behind.
-- Anything older than an hour is dead; the callback refuses it regardless.
-- delete from public.zoho_oauth_states where created_at < now() - interval '1 hour';
