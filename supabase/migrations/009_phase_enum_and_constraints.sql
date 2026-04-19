-- D1: Convert rooms.phase from text+CHECK to a proper Postgres enum.
-- Gives us type-safety in the DB layer to match the GamePhase union in
-- src/types/game.ts, catches typos at write time, and halves the storage
-- per row vs. text.
create type game_phase as enum (
  'lobby',
  'prompt',
  'answering',
  'diffusion',
  'voting',
  'round_results',
  'final'
);

-- Drop the partial index first — its predicate uses phase as text, so Postgres
-- cannot rewrite it during the column type conversion and raises
-- "operator does not exist: game_phase = text".
drop index if exists rooms_lobby_idx;

alter table rooms drop constraint rooms_phase_check;

alter table rooms
  alter column phase drop default,
  alter column phase type game_phase using phase::game_phase,
  alter column phase set default 'lobby'::game_phase;

-- Recreate the lobby index against the enum type.
create index rooms_lobby_idx on rooms(phase, is_deleted)
  where phase = 'lobby'::game_phase and is_deleted = false;

-- D3: Bound current_round and diffusion_index. TOTAL_ROUNDS = 5 in app code —
-- fail loud at the DB layer if any bug ever tries to write an out-of-range
-- value. If TOTAL_ROUNDS changes, bump this CHECK to match.
alter table rooms
  add constraint rooms_current_round_range
    check (current_round between 0 and 5);

alter table rooms
  add constraint rooms_diffusion_index_nonneg
    check (diffusion_index >= 0);

-- L2: Atomic vote swap. The app previously DELETE+INSERT'd votes when a
-- voter changed their pick; the unique (room_id, round, voter_player_id)
-- constraint lets us UPSERT instead, but the vote_count triggers only fire on
-- INSERT/DELETE — so we need an UPDATE trigger to keep counts correct when
-- ON CONFLICT takes the UPDATE path.
create or replace function shift_vote_count()
returns trigger language plpgsql as $$
begin
  if OLD.answer_id is distinct from NEW.answer_id then
    update answers set vote_count = vote_count - 1 where id = OLD.answer_id;
    update answers set vote_count = vote_count + 1 where id = NEW.answer_id;
  end if;
  return NEW;
end;
$$;

create trigger on_vote_updated
  after update on votes
  for each row execute function shift_vote_count();
