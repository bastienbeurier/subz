-- Extend language support to include Spanish
alter table rooms drop constraint if exists rooms_language_check;
alter table rooms add constraint rooms_language_check check (language in ('en', 'fr', 'es'));
