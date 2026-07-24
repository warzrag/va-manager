alter table public.twitter_accounts
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_scan_error text;

create index if not exists idx_twitter_accounts_retry_queue
  on public.twitter_accounts (next_retry_at asc nulls first, last_scanned_at asc nulls first);
