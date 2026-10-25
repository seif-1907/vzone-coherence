-- Direct video uploads for existing projects. Run this after the pre-sale migration.
alter table public.lesson_media
  add column if not exists storage_path text,
  add column if not exists mime_type text;
alter table public.lesson_media alter column vimeo_id drop not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 524288000, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
