-- ═══════════════════════════════════════════════════════════════
--  VERY SHORT — Migration 002: Storage, Triggers & Extras
--  Run this AFTER 001_initial_schema.sql in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
--  STORAGE BUCKETS
-- ───────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos',  'videos',  true, 104857600, array['video/mp4','video/webm','video/quicktime','video/x-msvideo']),
  ('avatars', 'avatars', true, 5242880,   array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────────
--  STORAGE POLICIES — videos bucket
-- ───────────────────────────────────────────────────────────────
create policy "videos: public read"
  on storage.objects for select using (bucket_id = 'videos');

create policy "videos: auth upload"
  on storage.objects for insert
  with check (bucket_id = 'videos' and auth.uid() is not null);

create policy "videos: owner delete"
  on storage.objects for delete
  using (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);

-- ───────────────────────────────────────────────────────────────
--  STORAGE POLICIES — avatars bucket
-- ───────────────────────────────────────────────────────────────
create policy "avatars: public read"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "avatars: auth upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);

create policy "avatars: owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: owner delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ───────────────────────────────────────────────────────────────
--  ADD avatar_url TO PROFILES (if missing)
-- ───────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists follower_count  bigint default 0,
  add column if not exists following_count bigint default 0,
  add column if not exists website text,
  add column if not exists location text;

-- ───────────────────────────────────────────────────────────────
--  FOLLOWER COUNT TRIGGERS
-- ───────────────────────────────────────────────────────────────
create or replace function public.update_follow_counts()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'active' then
    update public.profiles set follower_count  = follower_count  + 1 where id = NEW.following_id;
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
  elsif TG_OP = 'DELETE' and OLD.status = 'active' then
    update public.profiles set follower_count  = greatest(follower_count  - 1, 0) where id = OLD.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = OLD.follower_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists on_follow_count on public.follows;
create trigger on_follow_count
  after insert or delete on public.follows
  for each row execute function public.update_follow_counts();

-- ───────────────────────────────────────────────────────────────
--  STORY VIEWS — expose viewer profiles
-- ───────────────────────────────────────────────────────────────
-- Add RLS policy so story owners can see who viewed
create policy "story owner sees viewers"
  on public.story_views for select
  using (
    auth.uid() in (
      select user_id from public.stories where id = story_id
    )
    or auth.uid() = viewer_id
  );

-- ───────────────────────────────────────────────────────────────
--  REALTIME — add tables only if not already in publication
-- ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────
--  REBUILD FOLLOWER COUNTS (run once to sync existing data)
-- ───────────────────────────────────────────────────────────────
update public.profiles p
set
  follower_count  = (select count(*) from public.follows where following_id = p.id and status = 'active'),
  following_count = (select count(*) from public.follows where follower_id  = p.id and status = 'active');
