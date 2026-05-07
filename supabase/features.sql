-- Run this after schema.sql and notifications.sql

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  wallet_address text not null,
  label text not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, wallet_address)
);
create index if not exists contacts_user_idx on contacts (user_id);

create table if not exists recurring_payments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references users(id) on delete cascade not null,
  recipient_username text,
  recipient_address text,
  amount numeric not null,
  token text not null default 'So11111111111111111111111111111111111111112',
  decimals int not null default 9,
  memo text,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists recurring_creator_idx on recurring_payments (creator_id);
create index if not exists recurring_active_next_idx on recurring_payments (active, next_run_at);
