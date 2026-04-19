create table players (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  room_id         uuid not null references rooms(id) on delete cascade,
  pseudo          text not null,
  color           text not null,
  avatar_index    integer not null,
  score           integer not null default 0,
  is_ready        boolean not null default false,
  is_connected    boolean not null default true,
  is_kicked       boolean not null default false,
  last_seen_at    timestamptz not null default now(),
  joined_round    integer not null default 0
);

create index players_room_idx on players(room_id);
create index players_room_connected_idx on players(room_id, is_connected) where is_connected = true;

-- Enable realtime
alter publication supabase_realtime add table players;
