-- Keeps the status column in sync with last_active for owned rooms.
-- Run in Supabase SQL editor, then call from the app or a cron job.

create or replace function sync_room_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rooms
  set status = case
    when user_id is null then status
    when last_active is null then 'occupied'
    when last_active > now() - interval '7 days' then 'occupied'
    when last_active > now() - interval '30 days' then 'inactive'
    else 'abandoned'
  end
  where user_id is not null;
end;
$$;

grant execute on function sync_room_statuses() to anon, authenticated;
