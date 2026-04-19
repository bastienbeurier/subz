create table votes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  room_id           uuid not null references rooms(id) on delete cascade,
  round             integer not null,
  voter_player_id   uuid not null references players(id) on delete cascade,
  answer_id         uuid not null references answers(id) on delete cascade,

  unique(room_id, round, voter_player_id)
);

create index votes_room_round_idx on votes(room_id, round);

-- Enable realtime
alter publication supabase_realtime add table votes;
