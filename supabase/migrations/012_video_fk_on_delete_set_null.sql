alter table rooms
  drop constraint rooms_current_video_id_fkey,
  add constraint rooms_current_video_id_fkey
    foreign key (current_video_id)
    references videos(id)
    on delete set null;
