-- D2: Kick functionality was removed — is_kicked is now dead weight carried
-- through every query that touches players. Drop the column, drop the
-- partial-index predicate that relied on it, and recreate the avatar-unique
-- index as a plain unique index since there's no longer any "soft" state
-- that should be excluded from the uniqueness check.

drop index if exists players_room_avatar_unique;

alter table players drop column is_kicked;

create unique index players_room_avatar_unique
  on players(room_id, avatar_index);
