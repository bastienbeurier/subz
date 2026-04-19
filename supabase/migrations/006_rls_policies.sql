-- Enable RLS on all tables
alter table videos  enable row level security;
alter table rooms   enable row level security;
alter table players enable row level security;
alter table answers enable row level security;
alter table votes   enable row level security;

-- videos: anyone can read active videos
create policy "videos_select" on videos for select using (is_active = true);

-- rooms: anyone can read non-deleted rooms
create policy "rooms_select" on rooms for select using (is_deleted = false);

-- players: anyone can read players
create policy "players_select" on players for select using (true);

-- answers: anyone can read answers
create policy "answers_select" on answers for select using (true);

-- votes: anyone can read votes
create policy "votes_select" on votes for select using (true);

-- All inserts/updates/deletes go through API routes using the service role key,
-- which bypasses RLS entirely. No additional mutation policies needed for anon.
