-- L1: Supabase Realtime DELETE events only include the primary key in the
-- old-record payload by default, which means client filters like
-- room_id=eq.<uuid> can't be applied server-side — you'd either receive
-- every DELETE across all rooms, or none. REPLICA IDENTITY FULL makes
-- Postgres include the full row in the WAL, so Supabase can filter DELETEs
-- by room_id the same way it already filters INSERT/UPDATE.
--
-- Cost: a small WAL-size increase per delete. For our volume (a few deletes
-- per room per game) this is negligible.

alter table players replica identity full;
alter table answers replica identity full;
alter table votes   replica identity full;
