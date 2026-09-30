-- V-Zone Coherence schema. Run once in the Supabase SQL editor (or via the CLI / MCP).
-- After signing up with your own account, promote yourself:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

create extension if not exists pgcrypto;

-- ───────────── profiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────────── catalogue ─────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tagline text,
  description text,
  kind text not null default 'course' check (kind in ('course','live','one_to_one')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  cover_url text,
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text,
  duration_seconds integer,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.lessons(course_id, position);

-- Video ids live in a separate table so they are never exposed to people who may not watch.
create table public.lesson_media (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  vimeo_id text not null,
  vimeo_hash text
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  storage_path text not null,
  mime_type text,
  is_preview boolean not null default false,
  allow_download boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────── commerce ─────────────
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off integer check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents > 0),
  max_uses integer,
  uses integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (percent_off is not null or amount_off_cents is not null)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  currency text not null default 'USD',
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  total_cents integer not null,
  promo_code text,
  paypal_order_id text unique,
  paypal_capture_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  price_cents integer not null
);

create table public.enrollments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'purchase' check (source in ('purchase','manual','promo')),
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ───────────── viewing + stats ─────────────
create table public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_seconds integer not null default 0,
  last_position_seconds integer not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- One row per playback session. View count = sessions, duration = sum(seconds_watched).
create table public.view_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  seconds_watched integer not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.view_sessions(lesson_id);
create index on public.view_sessions(user_id);

-- ───────────── live classes, meetings, reminders ─────────────
create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid references public.courses(id) on delete set null, -- enrolled in this = allowed in. null = any signed-in client.
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  room text not null default encode(gen_random_bytes(9), 'hex'),
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  room text not null default encode(gen_random_bytes(9), 'hex'),
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('lesson','live','meeting')),
  ref_id uuid not null,
  remind_at timestamptz not null,
  sent_at timestamptz,
  unique (user_id, kind, ref_id)
);
create index on public.reminders(remind_at) where sent_at is null;

-- ───────────── newsletter + contact ─────────────
create table public.newsletter_subscribers (
  email text primary key,
  synced_to_brevo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ───────────── access helpers ─────────────
create or replace function public.is_enrolled(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where user_id = auth.uid() and course_id = p_course);
$$;

-- May the current user watch this lesson right now? Enforces "in order" viewing.
create or replace function public.can_watch(p_lesson uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l lessons%rowtype; prev uuid;
begin
  select * into l from lessons where id = p_lesson;
  if not found then return false; end if;
  if is_admin() or l.is_preview then return true; end if;
  if not is_enrolled(l.course_id) then return false; end if;
  select id into prev from lessons
    where course_id = l.course_id and (position, created_at) < (l.position, l.created_at)
    order by position desc, created_at desc limit 1;
  if prev is null then return true; end if;
  return exists (select 1 from lesson_progress where user_id = auth.uid() and lesson_id = prev and completed);
end $$;

-- Admin statistics: per lesson, per client.
create or replace view public.lesson_stats with (security_invoker = true) as
select l.id as lesson_id, l.title, l.course_id,
       count(vs.id) filter (where vs.seconds_watched >= 5) as view_count,
       coalesce(sum(vs.seconds_watched), 0) as total_seconds,
       count(distinct vs.user_id) as unique_viewers
from lessons l left join view_sessions vs on vs.lesson_id = l.id
group by l.id;

create or replace view public.client_stats with (security_invoker = true) as
select p.id as user_id, p.email, p.full_name, l.course_id, l.id as lesson_id, l.title as lesson_title,
       count(vs.id) filter (where vs.seconds_watched >= 5) as view_count,
       coalesce(sum(vs.seconds_watched), 0) as total_seconds
from view_sessions vs
join profiles p on p.id = vs.user_id
join lessons l on l.id = vs.lesson_id
group by p.id, l.id;

-- ───────────── row level security ─────────────
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_media enable row level security;
alter table public.documents enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.view_sessions enable row level security;
alter table public.live_classes enable row level security;
alter table public.meetings enable row level security;
alter table public.reminders enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;

-- profiles
create policy "own profile" on public.profiles for select using (id = auth.uid() or is_admin());
create policy "update own name" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "admin all profiles" on public.profiles for all using (is_admin()) with check (is_admin());

-- catalogue: anyone reads published courses & lesson metadata; admin manages
create policy "read published courses" on public.courses for select using (published or is_admin());
create policy "admin courses" on public.courses for all using (is_admin()) with check (is_admin());
create policy "read lessons" on public.lessons for select
  using (is_admin() or exists (select 1 from courses c where c.id = course_id and c.published));
create policy "admin lessons" on public.lessons for all using (is_admin()) with check (is_admin());
create policy "watchable media" on public.lesson_media for select using (can_watch(lesson_id));
create policy "admin media" on public.lesson_media for all using (is_admin()) with check (is_admin());
create policy "read documents meta" on public.documents for select
  using (is_admin() or is_preview or is_enrolled(course_id));
create policy "admin documents" on public.documents for all using (is_admin()) with check (is_admin());

-- commerce (writes happen server-side with the service role)
create policy "admin promo" on public.promo_codes for all using (is_admin()) with check (is_admin());
create policy "own orders" on public.orders for select using (user_id = auth.uid() or is_admin());
create policy "own order items" on public.order_items for select
  using (is_admin() or exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own enrollments" on public.enrollments for select using (user_id = auth.uid() or is_admin());
create policy "admin enrollments" on public.enrollments for all using (is_admin()) with check (is_admin());

-- viewing
create policy "own progress" on public.lesson_progress for select using (user_id = auth.uid() or is_admin());
create policy "own sessions" on public.view_sessions for select using (user_id = auth.uid() or is_admin());

-- live / meetings / reminders
create policy "read live classes" on public.live_classes for select
  using (is_admin() or course_id is null or is_enrolled(course_id));
create policy "admin live classes" on public.live_classes for all using (is_admin()) with check (is_admin());
create policy "own meetings" on public.meetings for all
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
create policy "own reminders" on public.reminders for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- newsletter / contact: admin read only (inserts go through server routes)
create policy "admin subscribers" on public.newsletter_subscribers for select using (is_admin());
create policy "admin contact" on public.contact_messages for select using (is_admin());

-- ───────────── table privileges ─────────────
-- Newer Supabase projects no longer expose tables created in SQL automatically, so grant access explicitly.
-- Row level security (above) still decides which rows each person can actually see.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;

-- ───────────── storage ─────────────
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
  on conflict (id) do nothing;
-- Uploads/downloads for documents are done server-side with the service role and signed URLs.
-- Cover images are public; only admins can upload:
create policy "admin upload covers" on storage.objects for insert
  with check (bucket_id = 'covers' and public.is_admin());
create policy "admin update covers" on storage.objects for update
  using (bucket_id = 'covers' and public.is_admin());

-- Seed the offers from the current site (edit prices and text in the admin later)
insert into public.courses (slug, title, tagline, description, kind, price_cents, published, position) values
  ('v-zone-start',  'V-Zone Start',  'The foundational program to build strength and align your mindset', null, 'course', 30000, true, 1),
  ('v-zone-embody', 'V-Zone Embody', 'Deepen your practice and fully integrate mind-body alignment', null, 'course', 50000, true, 2),
  ('v-zone-one',    'V-Zone ONE',    'Live One-to-One Coherence with Vilma',
'You’ve entered a space created for remembering who you are.

This is a live, one-to-one coherence experience. A space where body, mind, breath, and energy are brought back into alignment through intentional movement — to restore inner order.

Each session is guided, present, and precise. Designed to awaken strength, clarity, and stability at the same time. Here, every movement has purpose. Every transition carries awareness. The body is educated to listen, respond, and integrate.

In V-Zone Coherence, training becomes a state — where effort sharpens focus, focus refines energy, and energy reorganizes how you show up in your life.

I am fully present in every minute of our work together. My experience, attention, and guidance shape the session as it unfolds — responding to your body, your rhythm, and your current state. You move with intelligence — and access capacity that was already there, waiting to be activated.

Duration: 50–60 minutes of focused, personalized coherence training.

And the work does not end when the session ends. Support continues beyond the hour — with clarity, guidance, and presence whenever alignment wavers. Coherence is not created in isolation; it is sustained through awareness, consistency, and lived practice.

Before we begin, you’ll answer a few questions. Not as a formality — but as an act of honesty. For me, to understand where you are. For you, to meet yourself clearly and honestly ask: Am I ready to live in coherence?

This space is for those who feel the internal call — to rise without force, to build strength without chaos, to embody alignment rather than chase change. If you are ready to move with intention and live aligned, your work begins here.',
   'one_to_one', 0, true, 3),
  ('v-zone-live',   'V-Zone LIVE classes', 'Live classes with Vilma', null, 'live', 100, true, 4)
on conflict (slug) do nothing;
