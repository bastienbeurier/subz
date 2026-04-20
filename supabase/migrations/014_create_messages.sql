create table messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  room_id    uuid not null references rooms(id) on delete cascade,
  player_id  uuid references players(id) on delete set null,
  text       text not null check (char_length(text) between 1 and 200)
);

create index on messages(room_id, created_at);

-- Enable realtime
alter publication supabase_realtime add table messages;

-- RLS
alter table messages enable row level security;
create policy "messages_select" on messages for select using (true);
