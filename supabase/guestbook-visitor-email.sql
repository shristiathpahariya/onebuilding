-- Run in Supabase SQL editor if guestbook inserts require visitor_email.

alter table guestbook
  add column if not exists visitor_email text;
