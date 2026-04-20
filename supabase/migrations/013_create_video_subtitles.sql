create table video_subtitles (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  video_id   uuid not null references videos(id) on delete cascade,
  start_ms   integer not null,
  end_ms     integer not null,
  text       text not null,
  check (end_ms > start_ms)
);

create index on video_subtitles(video_id);

-- Enable realtime
alter publication supabase_realtime add table video_subtitles;

-- RLS
alter table video_subtitles enable row level security;
create policy "video_subtitles_select" on video_subtitles for select using (true);
