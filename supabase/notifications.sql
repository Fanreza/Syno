-- Run this in Supabase SQL editor after schema.sql

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  type text not null, -- payment_received | split_paid | split_created | gift_claimed | gift_received | payroll_received
  title text not null,
  body text not null,
  data jsonb default '{}',
  read boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id, read) where read = false;
