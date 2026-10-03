-- ============================================================
-- BRAND IDENTITY (Module studio visuel — étape 3.1)
-- ============================================================
create table public.brand_identity (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid unique not null references public.workspaces(id) on delete cascade,
  nom_affiche       text,
  signature         text,
  logo_path         text,            -- storage path dans brand-assets
  avatar_path       text,            -- photo de profil, storage path
  couleurs          jsonb not null default '[]'::jsonb,
  -- [{hex: "#1A2B3C", role: "principale"|"secondaire"|"accent"|"fond"}]
  polices           jsonb not null default '{}'::jsonb,
  -- {titre: "Playfair Display", texte: "Inter"}
  charte            text,
  storage_used_bytes bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.brand_identity enable row level security;

create policy "owner can crud brand_identity"
  on public.brand_identity
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

create trigger set_updated_at
  before update on public.brand_identity
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ANNONCE MEDIA (liste ordonnée avec métadonnées)
-- ============================================================
create table public.annonce_media (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  annonce_id    uuid not null references public.annonces(id) on delete cascade,
  storage_path  text not null,       -- chemin dans bien-media
  thumb_path    text,                -- miniature 480px
  mime_type     text not null,
  taille_octets bigint not null,
  largeur       integer,
  hauteur       integer,
  ordre         integer not null default 0,
  is_couverture boolean not null default false,
  created_at    timestamptz not null default now()
);

create index on public.annonce_media (annonce_id, ordre);

alter table public.annonce_media enable row level security;

create policy "members can crud annonce_media"
  on public.annonce_media
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
-- STORAGE BUCKETS (privés, signed URLs)
-- ============================================================

-- Bucket pour les assets de marque (logo, avatar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets', 'brand-assets', false,
  2097152,  -- 2 Mo
  array['image/jpeg','image/png','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

-- Bucket pour les photos des biens (privé, signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bien-media', 'bien-media', false,
  10485760,  -- 10 Mo par fichier
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- ── Policies brand-assets ──────────────────────────────────
create policy "owner can upload brand assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "owner can read brand assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "owner can delete brand assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── Policies bien-media ────────────────────────────────────
create policy "owner can upload bien media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bien-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "owner can read bien media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bien-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "owner can delete bien media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bien-media'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ============================================================
-- RPC : calcul du quota storage utilisé par workspace
-- ============================================================
create or replace function public.get_storage_used(workspace_id_input uuid)
returns bigint
language sql
security definer
stable
as $$
  select coalesce(
    (select storage_used_bytes from public.brand_identity where workspace_id = workspace_id_input),
    0
  ) + coalesce(
    (select sum(taille_octets) from public.annonce_media where workspace_id = workspace_id_input),
    0
  );
$$;
