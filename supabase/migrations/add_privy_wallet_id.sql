-- Add privy_wallet_id to users so the server can sign on their behalf
alter table users add column if not exists privy_wallet_id text;
