alter table rooms add column creator_id uuid references players(id) on delete set null;
