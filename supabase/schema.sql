-- Payra schema (run in Supabase SQL editor)

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text unique not null,
  username text unique not null,
  email text,
  wallet_address text not null,
  privy_wallet_id text,
  created_at timestamptz default now()
);
create index if not exists users_username_idx on users (lower(username));
create index if not exists users_wallet_idx on users (wallet_address);

create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  friend_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references users(id),
  receiver_id uuid references users(id),
  receiver_address text,
  amount numeric not null,
  token text not null default 'SOL',
  tx_signature text,
  status text not null default 'pending', -- pending | confirmed | failed
  memo text,
  split_participant_id uuid references split_participants(id),
  created_at timestamptz default now()
);
create index if not exists payments_sender_idx on payments (sender_id);
create index if not exists payments_receiver_idx on payments (receiver_id);

create table if not exists split_bills (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references users(id),
  title text,
  total_amount numeric not null,
  token text not null default 'SOL',
  status text not null default 'open',
  created_at timestamptz default now()
);

create table if not exists split_participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references split_bills(id) on delete cascade,
  user_id uuid references users(id),
  username text,
  amount numeric not null,
  status text not null default 'pending',
  tx_signature text,
  paid_at timestamptz
);
create index if not exists split_participants_bill_idx on split_participants (bill_id);

create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references users(id),
  pool_wallet text,
  pool_privy_wallet_id text,
  total_amount numeric not null,
  token text not null default 'SOL',
  claimed_count int not null default 0,
  total_slots int not null,
  created_at timestamptz default now()
);

create table if not exists gift_claims (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid references gifts(id) on delete cascade,
  user_id uuid references users(id),
  amount numeric not null,
  tx_signature text,
  created_at timestamptz default now(),
  unique (gift_id, user_id)
);
