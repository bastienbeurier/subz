create table answers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  room_id         uuid not null references rooms(id) on delete cascade,
  player_id       uuid not null references players(id) on delete cascade,
  round           integer not null,
  text            text not null,
  display_order   integer,
  vote_count      integer not null default 0,

  unique(room_id, player_id, round)
);

create index answers_room_round_idx on answers(room_id, round);

-- Enable realtime
alter publication supabase_realtime add table answers;
