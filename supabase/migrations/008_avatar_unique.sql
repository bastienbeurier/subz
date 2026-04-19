-- Prevent two players in the same room from grabbing the same avatar slot.
-- Combined with the room-join code which picks the lowest unused avatar_index,
-- this caps active (non-kicked) players per room at AVATAR_COLORS.length (8),
-- and backstops the MAX_PLAYERS check against concurrent-join races.
create unique index players_room_avatar_unique
  on players(room_id, avatar_index)
  where is_kicked = false;
