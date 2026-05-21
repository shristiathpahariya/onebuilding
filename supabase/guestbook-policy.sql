-- Run in Supabase SQL editor if guestbook inserts fail.

create policy "Anyone can read guestbook"
on guestbook for select
to anon, authenticated
using (true);

create policy "Authenticated users can post guestbook"
on guestbook for insert
to authenticated
with check (true);
