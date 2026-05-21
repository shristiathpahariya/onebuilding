-- Run in the Supabase SQL editor if the column does not exist yet.

alter table rooms add column if not exists last_active timestamp default now();
