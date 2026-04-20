alter table payments add column if not exists split_participant_id uuid references split_participants(id);
