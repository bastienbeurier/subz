-- Add language support to video subtitles (EN is default/existing)
alter table video_subtitles add column if not exists language text not null default 'en';

create index if not exists video_subtitles_video_lang_idx on video_subtitles(video_id, language);

-- Add language preference to rooms (creator sets it in lobby)
alter table rooms add column if not exists language text not null default 'en'
  check (language in ('en', 'fr'));
