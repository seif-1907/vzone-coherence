-- Run this once for an existing V-Zone database after deploying the pre-sale feature.
alter table public.courses
  add column if not exists launch_at timestamptz,
  add column if not exists presale_price_cents integer check (presale_price_cents >= 0);
alter table public.courses add constraint course_presale_lower_than_standard
  check (presale_price_cents is null or presale_price_cents < price_cents);

alter table public.lessons add column if not exists cover_url text;
alter table public.enrollments add column if not exists launch_notified_at timestamptz;

-- V-Zone Start is sold before opening. Change these values in Admin → Courses as needed.
update public.courses
set launch_at = '2026-11-01T00:00:00Z',
    presale_price_cents = 20000,
    cover_url = '/images/v-zone-start-cover.png'
where slug = 'v-zone-start';

-- During pre-launch only the first, explicitly marked preview lesson is watchable.
create or replace function public.can_watch(p_lesson uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l lessons%rowtype; c courses%rowtype; first_lesson uuid; prev uuid;
begin
  select * into l from lessons where id = p_lesson;
  if not found then return false; end if;
  select * into c from courses where id = l.course_id;
  if is_admin() then return true; end if;
  if c.launch_at is not null and c.launch_at > now() then
    select id into first_lesson from lessons where course_id = l.course_id order by position, created_at limit 1;
    return l.id = first_lesson and l.is_preview;
  end if;
  if l.is_preview then return true; end if;
  if not is_enrolled(l.course_id) then return false; end if;
  select id into prev from lessons
    where course_id = l.course_id and (position, created_at) < (l.position, l.created_at)
    order by position desc, created_at desc limit 1;
  if prev is null then return true; end if;
  return exists (select 1 from lesson_progress where user_id = auth.uid() and lesson_id = prev and completed);
end $$;
