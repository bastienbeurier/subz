-- Increment vote_count on answers when a vote is inserted
create or replace function increment_vote_count()
returns trigger language plpgsql as $$
begin
  update answers set vote_count = vote_count + 1 where id = NEW.answer_id;
  return NEW;
end;
$$;

create trigger on_vote_inserted
  after insert on votes
  for each row execute function increment_vote_count();

-- Decrement vote_count on answers when a vote is deleted
create or replace function decrement_vote_count()
returns trigger language plpgsql as $$
begin
  update answers set vote_count = vote_count - 1 where id = OLD.answer_id;
  return OLD;
end;
$$;

create trigger on_vote_deleted
  after delete on votes
  for each row execute function decrement_vote_count();
