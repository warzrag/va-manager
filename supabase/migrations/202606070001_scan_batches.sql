alter table public.twitter_accounts
  add column if not exists last_scanned_at timestamptz,
  add column if not exists scan_error_count integer not null default 0;

create table if not exists public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  checked integer not null default 0,
  changed integer not null default 0,
  errors integer not null default 0,
  skipped integer not null default 0,
  batch_limit integer not null default 25,
  status text not null default 'running',
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_twitter_accounts_scan_order
  on public.twitter_accounts (last_scanned_at asc nulls first, created_at asc);

create index if not exists idx_scan_runs_org_started
  on public.scan_runs (organization_id, started_at desc);
