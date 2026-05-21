-- Run in the Supabase SQL editor if the note column does not exist yet.

alter table rooms add column if not exists note text;
