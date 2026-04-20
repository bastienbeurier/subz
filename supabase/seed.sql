-- Create the public storage bucket for game videos.
-- This runs after migrations on `supabase db reset` and `supabase start`.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;
