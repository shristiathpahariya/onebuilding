-- Bulletin dispatches live in the guestbook table (no separate events table).
-- Run in Supabase SQL editor after guestbook exists.

-- Optional: log abandoned rooms on the bulletin (security definer bypasses RLS).
create or replace function log_room_abandoned_guestbook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (OLD.status is distinct from 'abandoned') and NEW.status = 'abandoned' then
    insert into guestbook (room_id, message)
    values (NEW.id, 'Room ' || NEW.number || ' has gone dark.');
  end if;
  return NEW;
end;
$$;

drop trigger if exists rooms_abandoned_guestbook on rooms;
create trigger rooms_abandoned_guestbook
  after update of status on rooms
  for each row
  execute function log_room_abandoned_guestbook();
