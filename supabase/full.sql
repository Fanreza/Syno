-- Payra — full schema (single file, safe to re-run)
-- Run this once in the Supabase SQL editor. All statements use IF NOT EXISTS / IF EXISTS.

-- ─── Core tables ─────────────────────────────────────────────────────────────

create table if not exists users (
  id                 uuid primary key default gen_random_uuid(),
  privy_user_id      text unique not null,
  username           text unique not null,
  email              text,
  wallet_address     text not null,
  privy_wallet_id    text,
  fcm_token          text,
  created_at         timestamptz default now()
);
create index if not exists users_username_idx on users (lower(username));
create index if not exists users_wallet_idx   on users (wallet_address);

create table if not exists friends (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  friend_id  uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

create table if not exists split_bills (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid references users(id),
  title        text,
  total_amount numeric not null,
  token        text not null default 'So11111111111111111111111111111111111111112',
  status       text not null default 'open',
  created_at   timestamptz default now()
);

create table if not exists split_participants (
  id           uuid primary key default gen_random_uuid(),
  bill_id      uuid references split_bills(id) on delete cascade,
  user_id      uuid references users(id),
  username     text,
  amount       numeric not null,
  status       text not null default 'pending',
  tx_signature text,
  paid_at      timestamptz
);
create index if not exists split_participants_bill_idx on split_participants (bill_id);

-- payments depends on split_participants, so it comes after
create table if not exists payments (
  id                   uuid primary key default gen_random_uuid(),
  sender_id            uuid references users(id),
  receiver_id          uuid references users(id),
  receiver_address     text,
  amount               numeric not null,
  token                text not null default 'So11111111111111111111111111111111111111112',
  tx_signature         text,
  status               text not null default 'pending',
  memo                 text,
  split_participant_id uuid references split_participants(id),
  created_at           timestamptz default now()
);
create index if not exists payments_sender_idx   on payments (sender_id);
create index if not exists payments_receiver_idx on payments (receiver_id);

create table if not exists gifts (
  id                  uuid primary key default gen_random_uuid(),
  creator_id          uuid references users(id),
  pool_wallet         text,
  pool_privy_wallet_id text,
  total_amount        numeric not null,
  token               text not null default 'So11111111111111111111111111111111111111112',
  claimed_count       int not null default 0,
  total_slots         int not null,
  created_at          timestamptz default now()
);

create table if not exists gift_claims (
  id           uuid primary key default gen_random_uuid(),
  gift_id      uuid references gifts(id) on delete cascade,
  user_id      uuid references users(id),
  amount       numeric not null,
  tx_signature text,
  created_at   timestamptz default now(),
  unique (gift_id, user_id)
);

create table if not exists private_transfers (
  id                 uuid primary key default gen_random_uuid(),
  sender_id          uuid references users(id),
  recipient_address  text not null,
  recipient_id       uuid references users(id),
  amount             numeric not null,
  mint               text not null,
  deposit_signature  text,
  withdraw_signature text,
  status             text not null default 'mixing',
  memo               text,
  created_at         timestamptz default now()
);
create index if not exists private_transfers_sender_idx on private_transfers (sender_id);
create index if not exists private_transfers_status_idx on private_transfers (status);

-- ─── Notifications ────────────────────────────────────────────────────────────

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade not null,
  type       text not null,
  title      text not null,
  body       text not null,
  data       jsonb default '{}',
  read       boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx   on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id, read) where read = false;

-- ─── Portfolio snapshots ──────────────────────────────────────────────────────

create table if not exists portfolio_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  snapshot_date date not null,
  total_usd     numeric not null,
  sol_balance   numeric not null,
  sol_price     numeric not null,
  tokens        jsonb not null default '[]',
  created_at    timestamptz default now(),
  unique (user_id, snapshot_date)
);
create index if not exists portfolio_snapshots_user_date_idx on portfolio_snapshots (user_id, snapshot_date desc);

-- ─── Contacts & recurring payments ───────────────────────────────────────────

create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade not null,
  wallet_address text not null,
  label          text not null,
  note           text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, wallet_address)
);
create index if not exists contacts_user_idx on contacts (user_id);

create table if not exists recurring_payments (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid references users(id) on delete cascade not null,
  recipient_username text,
  recipient_address  text,
  amount             numeric not null,
  token              text not null default 'So11111111111111111111111111111111111111112',
  decimals           int not null default 9,
  memo               text,
  frequency          text not null check (frequency in ('weekly', 'monthly')),
  next_run_at        timestamptz not null,
  last_run_at        timestamptz,
  active             boolean not null default true,
  created_at         timestamptz default now()
);
create index if not exists recurring_creator_idx       on recurring_payments (creator_id);
create index if not exists recurring_active_next_idx   on recurring_payments (active, next_run_at);

-- ─── Backfill columns for existing databases ─────────────────────────────────
-- Safe to run even if the columns already exist.

alter table users     add column if not exists privy_wallet_id text;
alter table users     add column if not exists fcm_token        text;
alter table payments  add column if not exists split_participant_id uuid references split_participants(id);
