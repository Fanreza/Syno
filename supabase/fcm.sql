-- Run this after schema.sql to add FCM push notification support
alter table users add column if not exists fcm_token text;
