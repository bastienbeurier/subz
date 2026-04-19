create table videos (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  title           text not null,
  storage_path    text not null,
  public_url      text not null,
  duration_ms     integer not null,
  subtitle_start_ms integer not null,
  subtitle_end_ms   integer not null,
  is_active       boolean not null default true
);

-- Enable realtime
alter publication supabase_realtime add table videos;
