-- Achievl forum: tables, access rules and triggers.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it only creates what is missing.
--
-- Players sign in anonymously (Authentication -> Sign In / Providers -> enable
-- "Anonymous Sign-Ins"), so there are no passwords or emails. An anonymous player
-- still has the `authenticated` role, which is what the rules below are written for.

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 24),
  title text not null check (char_length(title) between 3 and 80),
  body text not null check (char_length(body) between 1 and 2000),
  reply_count integer not null default 0,
  -- Set to true from the dashboard to take a thread down. Only its author still sees it.
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reports land here for you to read in the dashboard (Table Editor -> forum_reports).
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null default auth.uid() references auth.users (id) on delete cascade,
  thread_id uuid references public.forum_threads (id) on delete cascade,
  post_id uuid references public.forum_posts (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  check (thread_id is not null or post_id is not null)
);

create index if not exists forum_threads_recent on public.forum_threads (last_post_at desc);
create index if not exists forum_posts_thread on public.forum_posts (thread_id, created_at);
create index if not exists forum_posts_author_recent on public.forum_posts (author, created_at desc);
create index if not exists forum_threads_author_recent on public.forum_threads (author, created_at desc);

-- ---- Server-side stamping and rate limits -------------------------------------
-- Whatever the app sends, the author, the time and the counters are set here.

create or replace function public.forum_stamp_thread() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if exists (select 1 from public.forum_threads t where t.author = auth.uid() and t.created_at > now() - interval '60 seconds') then
    raise exception 'slow down: one new thread a minute';
  end if;
  new.author := auth.uid();
  new.created_at := now();
  new.last_post_at := now();
  new.reply_count := 0;
  new.hidden := false;
  return new;
end $$;

create or replace function public.forum_stamp_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if exists (select 1 from public.forum_posts p where p.author = auth.uid() and p.created_at > now() - interval '5 seconds') then
    raise exception 'slow down: one reply every 5 seconds';
  end if;
  new.author := auth.uid();
  new.created_at := now();
  new.hidden := false;
  return new;
end $$;

create or replace function public.forum_count_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_threads set reply_count = reply_count + 1, last_post_at = now() where id = new.thread_id;
    return new;
  end if;
  update public.forum_threads set reply_count = greatest(0, reply_count - 1) where id = old.thread_id;
  return old;
end $$;

drop trigger if exists forum_stamp_thread on public.forum_threads;
create trigger forum_stamp_thread before insert on public.forum_threads for each row execute function public.forum_stamp_thread();

drop trigger if exists forum_stamp_post on public.forum_posts;
create trigger forum_stamp_post before insert on public.forum_posts for each row execute function public.forum_stamp_post();

drop trigger if exists forum_count_post on public.forum_posts;
create trigger forum_count_post after insert or delete on public.forum_posts for each row execute function public.forum_count_post();

-- ---- Access rules -------------------------------------------------------------
-- Signed-in players can read everything that is not hidden, write as themselves and
-- delete their own. Nobody can edit, and only the dashboard can hide.

alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reports enable row level security;

revoke all on public.forum_threads, public.forum_posts, public.forum_reports from anon, authenticated;
grant select, insert, delete on public.forum_threads, public.forum_posts to authenticated;
grant insert on public.forum_reports to authenticated;

drop policy if exists "read threads" on public.forum_threads;
create policy "read threads" on public.forum_threads for select to authenticated
  using (not hidden or author = (select auth.uid()));
drop policy if exists "start threads" on public.forum_threads;
create policy "start threads" on public.forum_threads for insert to authenticated
  with check (author = (select auth.uid()));
drop policy if exists "delete own threads" on public.forum_threads;
create policy "delete own threads" on public.forum_threads for delete to authenticated
  using (author = (select auth.uid()));

drop policy if exists "read posts" on public.forum_posts;
create policy "read posts" on public.forum_posts for select to authenticated
  using (not hidden or author = (select auth.uid()));
drop policy if exists "write posts" on public.forum_posts;
create policy "write posts" on public.forum_posts for insert to authenticated
  with check (author = (select auth.uid()));
drop policy if exists "delete own posts" on public.forum_posts;
create policy "delete own posts" on public.forum_posts for delete to authenticated
  using (author = (select auth.uid()));

drop policy if exists "file reports" on public.forum_reports;
create policy "file reports" on public.forum_reports for insert to authenticated
  with check (reporter = (select auth.uid()));

-- ---- Live updates -------------------------------------------------------------
-- New replies reach open threads straight away.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'forum_posts') then
    alter publication supabase_realtime add table public.forum_posts;
  end if;
end $$;
