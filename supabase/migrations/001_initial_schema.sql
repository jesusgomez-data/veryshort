-- ═══════════════════════════════════════════════════════
--  VERY SHORT — Supabase Database Schema
--  Version: 1.0
--  Stack: PostgreSQL + Supabase Auth + Storage + Realtime
-- ═══════════════════════════════════════════════════════

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ──────────────────────────────────────────────
--  PROFILES
-- ──────────────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique not null,
  display_name  text,
  bio           text,
  avatar_url    text,
  avatar_emoji  text default '🧑',
  website       text,
  is_verified   boolean default false,
  is_private    boolean default false,
  total_views   bigint default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.profiles
  add constraint username_length check (char_length(username) >= 3 and char_length(username) <= 30),
  add constraint username_format check (username ~ '^[a-zA-Z0-9_.]+$');

-- ──────────────────────────────────────────────
--  STORIES
-- ──────────────────────────────────────────────
create table public.stories (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  video_url      text not null,
  thumbnail_url  text,
  duration_ms    integer not null check (duration_ms > 0 and duration_ms <= 7500),
  caption        text,
  emoji          text,
  category       text default 'general',
  location       text,
  is_active      boolean default true,
  expires_at     timestamptz default (now() + interval '24 hours'),
  view_count     bigint default 0,
  reaction_count bigint default 0,
  reply_count    bigint default 0,
  share_count    bigint default 0,
  is_flagged     boolean default false,
  flagged_count  integer default 0,
  created_at     timestamptz default now()
);

create index idx_stories_user_id     on public.stories(user_id);
create index idx_stories_created_at  on public.stories(created_at desc);
create index idx_stories_expires_at  on public.stories(expires_at) where is_active = true;
create index idx_stories_category    on public.stories(category) where is_active = true;

-- ──────────────────────────────────────────────
--  STORY VIEWS
-- ──────────────────────────────────────────────
create table public.story_views (
  id         uuid default uuid_generate_v4() primary key,
  story_id   uuid references public.stories(id) on delete cascade not null,
  viewer_id  uuid references public.profiles(id) on delete cascade,
  viewed_at  timestamptz default now(),
  watch_pct  integer default 0 check (watch_pct >= 0 and watch_pct <= 100),
  unique(story_id, viewer_id)
);

create index idx_views_story_id  on public.story_views(story_id);
create index idx_views_viewer_id on public.story_views(viewer_id);

-- ──────────────────────────────────────────────
--  REACTIONS
-- ──────────────────────────────────────────────
create table public.reactions (
  id         uuid default uuid_generate_v4() primary key,
  story_id   uuid references public.stories(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  emoji      text not null default '❤️',
  created_at timestamptz default now(),
  unique(story_id, user_id)
);

create index idx_reactions_story_id on public.reactions(story_id);

-- ──────────────────────────────────────────────
--  REPLIES
-- ──────────────────────────────────────────────
create table public.replies (
  id         uuid default uuid_generate_v4() primary key,
  story_id   uuid references public.stories(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  text       text,
  video_url  text,
  created_at timestamptz default now()
);

create index idx_replies_story_id on public.replies(story_id);

-- ──────────────────────────────────────────────
--  FOLLOWS
-- ──────────────────────────────────────────────
create table public.follows (
  id           uuid default uuid_generate_v4() primary key,
  follower_id  uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  status       text default 'active' check (status in ('active', 'pending', 'blocked')),
  created_at   timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

create index idx_follows_follower  on public.follows(follower_id) where status = 'active';
create index idx_follows_following on public.follows(following_id) where status = 'active';

-- ──────────────────────────────────────────────
--  CONVERSATIONS & MESSAGES
-- ──────────────────────────────────────────────
create table public.conversations (
  id            uuid default uuid_generate_v4() primary key,
  participant_a uuid references public.profiles(id) on delete cascade not null,
  participant_b uuid references public.profiles(id) on delete cascade not null,
  last_message  text,
  last_msg_at   timestamptz,
  created_at    timestamptz default now(),
  unique(participant_a, participant_b),
  check (participant_a < participant_b)
);

create index idx_conv_a on public.conversations(participant_a);
create index idx_conv_b on public.conversations(participant_b);

create table public.messages (
  id              uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete cascade not null,
  text            text,
  story_id        uuid references public.stories(id) on delete set null,
  is_read         boolean default false,
  created_at      timestamptz default now()
);

create index idx_messages_conv_id    on public.messages(conversation_id);
create index idx_messages_created_at on public.messages(created_at desc);

-- ──────────────────────────────────────────────
--  NOTIFICATIONS
-- ──────────────────────────────────────────────
create table public.notifications (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  actor_id   uuid references public.profiles(id) on delete cascade,
  type       text not null check (type in (
    'follow', 'reaction', 'reply', 'mention', 'story_view_milestone', 'message'
  )),
  story_id   uuid references public.stories(id) on delete cascade,
  is_read    boolean default false,
  data       jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_notifs_user_id on public.notifications(user_id, is_read, created_at desc);

-- ──────────────────────────────────────────────
--  HASHTAGS
-- ──────────────────────────────────────────────
create table public.hashtags (
  id          uuid default uuid_generate_v4() primary key,
  tag         text unique not null,
  story_count bigint default 0,
  created_at  timestamptz default now()
);

create table public.story_hashtags (
  story_id   uuid references public.stories(id) on delete cascade,
  hashtag_id uuid references public.hashtags(id) on delete cascade,
  primary key (story_id, hashtag_id)
);

-- ──────────────────────────────────────────────
--  REPORTS
-- ──────────────────────────────────────────────
create table public.reports (
  id          uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  story_id    uuid references public.stories(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  reason      text not null check (reason in (
    'spam', 'violence', 'adult', 'harassment', 'misinformation', 'other'
  )),
  description text,
  status      text default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at  timestamptz default now()
);

-- ═══════════════════════════════════════════════════════
--  FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'avatar_emoji', '🧑')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Increment view count
create or replace function public.increment_view_count(story_uuid uuid)
returns void language plpgsql security definer as $$
begin
  update public.stories set view_count = view_count + 1 where id = story_uuid;
  update public.profiles p
    set total_views = total_views + 1
    from public.stories s
    where s.id = story_uuid and p.id = s.user_id;
end;
$$;

-- View milestone notifications
create or replace function public.check_view_milestone()
returns trigger language plpgsql security definer as $$
declare
  v_count   bigint;
  v_user_id uuid;
begin
  select view_count, user_id into v_count, v_user_id
  from public.stories where id = new.story_id;
  if v_count in (1000, 10000, 100000, 1000000) then
    insert into public.notifications (user_id, type, story_id, data)
    values (v_user_id, 'story_view_milestone', new.story_id,
      jsonb_build_object('milestone', v_count));
  end if;
  return new;
end;
$$;

create trigger on_view_milestone
  after insert on public.story_views
  for each row execute function public.check_view_milestone();

-- Follow notification
create or replace function public.handle_new_follow()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'active' then
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_new_follow
  after insert on public.follows
  for each row execute function public.handle_new_follow();

-- Reaction notification + count
create or replace function public.handle_new_reaction()
returns trigger language plpgsql security definer as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.stories where id = new.story_id;
  if v_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, story_id, data)
    values (v_owner, new.user_id, 'reaction', new.story_id,
      jsonb_build_object('emoji', new.emoji));
  end if;
  update public.stories set reaction_count = reaction_count + 1 where id = new.story_id;
  return new;
end;
$$;

create trigger on_new_reaction
  after insert on public.reactions
  for each row execute function public.handle_new_reaction();

-- Update conversation last message
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
  set last_message = new.text, last_msg_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Expire stories (schedule via pg_cron or Edge Function cron)
create or replace function public.expire_stories()
returns void language plpgsql security definer as $$
begin
  update public.stories
  set is_active = false
  where expires_at < now() and is_active = true;
end;
$$;

-- ═══════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════
alter table public.profiles      enable row level security;
alter table public.stories       enable row level security;
alter table public.story_views   enable row level security;
alter table public.reactions     enable row level security;
alter table public.replies       enable row level security;
alter table public.follows       enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;

-- PROFILES
create policy "Public profiles viewable"    on public.profiles for select using (true);
create policy "Own profile editable"        on public.profiles for update using (auth.uid() = id);

-- STORIES
create policy "Active stories public"       on public.stories for select using (is_active = true);
create policy "Own story insert"            on public.stories for insert with check (auth.uid() = user_id);
create policy "Own story delete"            on public.stories for delete using (auth.uid() = user_id);

-- REACTIONS
create policy "Reactions viewable"          on public.reactions for select using (true);
create policy "Auth users react"            on public.reactions for insert with check (auth.uid() = user_id);
create policy "Own reaction delete"         on public.reactions for delete using (auth.uid() = user_id);

-- FOLLOWS
create policy "Follows viewable"            on public.follows for select using (true);
create policy "Auth users follow"           on public.follows for insert with check (auth.uid() = follower_id);
create policy "Own follow delete"           on public.follows for delete using (auth.uid() = follower_id);

-- CONVERSATIONS
create policy "Own conversations"           on public.conversations for select
  using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "Create conversation"         on public.conversations for insert
  with check (auth.uid() = participant_a or auth.uid() = participant_b);

-- MESSAGES
create policy "Own messages"                on public.messages for select
  using (auth.uid() in (
    select participant_a from public.conversations where id = conversation_id
    union
    select participant_b from public.conversations where id = conversation_id
  ));
create policy "Send message"                on public.messages for insert with check (auth.uid() = sender_id);

-- NOTIFICATIONS
create policy "Own notifications"           on public.notifications for select using (auth.uid() = user_id);
create policy "System creates notifs"       on public.notifications for insert with check (true);
create policy "Mark own notifs read"        on public.notifications for update using (auth.uid() = user_id);
