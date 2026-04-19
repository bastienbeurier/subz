create table rooms (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  code                text not null unique,
  phase               text not null default 'lobby',
  current_round       integer not null default 0,
  current_video_id    uuid references videos(id),
  used_video_ids      uuid[] not null default '{}',
  answering_deadline  timestamptz,
  voting_deadline     timestamptz,
  diffusion_index     integer not null default 0,
  auto_advance_at     timestamptz,
  last_activity_at    timestamptz not null default now(),
  is_deleted          boolean not null default false,

  constraint rooms_phase_check check (
    phase in ('lobby', 'prompt', 'answering', 'diffusion', 'voting', 'round_results', 'final')
  )
);

create index rooms_code_idx on rooms(code) where is_deleted = false;
create index rooms_lobby_idx on rooms(phase, is_deleted) where phase = 'lobby' and is_deleted = false;

-- Enable realtime
alter publication supabase_realtime add table rooms;
