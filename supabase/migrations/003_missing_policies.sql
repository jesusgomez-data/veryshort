-- ═══════════════════════════════════════════════════════
--  VERY SHORT — Migration 003: Políticas faltantes
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── Replies (tabla definida pero sin políticas) ──────────
create policy "Replies viewable"
  on public.replies for select using (true);

create policy "Auth users insert reply"
  on public.replies for insert
  with check (auth.uid() = user_id);

create policy "Own reply delete"
  on public.replies for delete
  using (auth.uid() = user_id);

-- ── Reactions: permitir DELETE (para togglear) ───────────
-- Ya debería existir, pero por si acaso:
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'reactions' and policyname = 'Own reaction delete'
  ) then
    execute 'create policy "Own reaction delete" on public.reactions
      for delete using (auth.uid() = user_id)';
  end if;
end $$;

-- ── Stories: permitir UPDATE de reaction_count ───────────
create policy "System updates stories"
  on public.stories for update
  using (true)
  with check (true);

-- ── Profiles: INSERT permitido (para trigger de onboarding) ──
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Own profile insert'
  ) then
    execute 'create policy "Own profile insert" on public.profiles
      for insert with check (auth.uid() = id)';
  end if;
end $$;

-- ── story_views: INSERT público (para tracking) ──────────
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'story_views' and policyname = 'Auth users insert view'
  ) then
    execute 'create policy "Auth users insert view" on public.story_views
      for insert with check (auth.uid() = viewer_id)';
  end if;
end $$;
