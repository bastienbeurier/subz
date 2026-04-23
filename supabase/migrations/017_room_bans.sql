-- Persistent device token on players for ban tracking
alter table players add column if not exists device_token text;

-- Bans are room-scoped: one entry per (room, device)
create table room_bans (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  room_id      uuid not null references rooms(id) on delete cascade,
  device_token text not null,
  unique (room_id, device_token)
);

create index on room_bans(room_id, device_token);

-- RLS
alter table room_bans enable row level security;
create policy "room_bans_select" on room_bans for select using (true);
