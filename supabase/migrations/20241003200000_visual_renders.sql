-- ============================================================
-- VISUAL RENDERS (étape 3.2 — studio visuel)
-- ============================================================

create table public.visual_renders (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  template_id   text not null,          -- 'annonce' | 'carrousel' | 'story'
  render_data   jsonb not null,         -- données utilisées (sans assets binaires)
  storage_path  text not null,          -- chemin dans bucket renders
  thumb_path    text,                   -- miniature
  taille_octets bigint not null default 0,
  created_at    timestamptz not null default now()
);

create index on public.visual_renders (workspace_id, created_at desc);
create index on public.visual_renders (user_id, created_at desc);

alter table public.visual_renders enable row level security;

create policy "members can crud visual_renders"
  on public.visual_renders
  using (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members where user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKET renders (PNG exports)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'renders', 'renders', false,
  20971520,  -- 20 Mo max par fichier
  array['image/png', 'application/zip']
)
on conflict (id) do nothing;

create policy "owner can upload renders"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner can read renders"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner can delete renders"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- RPC : rate limit — nb de rendus dans la dernière heure
-- ============================================================
create or replace function public.count_recent_renders(
  workspace_id_input uuid,
  hours_back integer default 1
)
returns bigint
language sql
security definer
stable
as $$
  select count(*)
  from public.visual_renders
  where workspace_id = workspace_id_input
    and created_at > now() - (hours_back || ' hours')::interval;
$$;
