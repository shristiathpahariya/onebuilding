-- Run this in the Supabase SQL editor if claiming fails silently.
-- "Owner update" only allows edits when you already own the room.
-- This policy allows authenticated users to claim unowned rooms.

create policy "Claim unowned room"
on rooms for update
to authenticated
using (user_id is null)
with check (auth.uid() = user_id);
