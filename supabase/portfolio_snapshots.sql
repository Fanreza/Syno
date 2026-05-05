-- Run this in Supabase SQL editor after schema.sql

create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  total_usd numeric not null,
  sol_balance numeric not null,
  sol_price numeric not null,
  tokens jsonb not null default '[]',
  created_at timestamptz default now(),
  unique (user_id, snapshot_date)
);

create index if not exists portfolio_snapshots_user_date_idx on portfolio_snapshots (user_id, snapshot_date desc);
