-- Vote kick tracking table
create table vote_kicks (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  room_id           uuid not null references rooms(id) on delete cascade,
  voter_player_id   uuid not null references players(id) on delete cascade,
  target_player_id  uuid not null references players(id) on delete cascade,
  unique (room_id, voter_player_id, target_player_id)
);

create index on vote_kicks(room_id, target_player_id);

-- Replica identity full so DELETE payloads include room_id for filtering
alter table vote_kicks replica identity full;

-- Enable realtime
alter publication supabase_realtime add table vote_kicks;

-- RLS
alter table vote_kicks enable row level security;
create policy "vote_kicks_select" on vote_kicks for select using (true);

-- Add message type to messages table
alter table messages add column type text not null default 'chat'
  check (type in ('chat', 'kick_vote', 'kick'));
