-- ImmoAI — Schéma SQL complet avec RLS
-- À exécuter dans l'éditeur SQL de Supabase

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- WORKSPACES (tenant)
-- ============================================================
create table public.workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'starter' check (plan in ('starter','pro','agence','trial')),
  plan_expires_at timestamptz,
  logo_url    text,
  brand_color text default '#2563EB',
  api_key     text unique default encode(gen_random_bytes(32), 'hex'),
  ai_quota_used   integer not null default 0,
  ai_quota_limit  integer not null default 20,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
create table public.workspace_members (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','admin','member')),
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ============================================================
-- ANNONCES (Module 1)
-- ============================================================
create table public.annonces (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  type_bien       text not null,
  surface         numeric,
  pieces          integer,
  localisation    text,
  equipements     text[],
  points_forts    text,
  ton             text not null default 'standard' check (ton in ('standard','luxe','familial','investisseur')),
  titre           text,
  description_longue   text,
  description_courte   text,
  description_en       text,
  statut          text not null default 'brouillon' check (statut in ('brouillon','publie','archive')),
  tokens_used     integer default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- LEADS (Module 2)
-- ============================================================
create table public.leads (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  prenom          text,
  nom             text,
  email           text,
  telephone       text,
  budget_min      numeric,
  budget_max      numeric,
  type_recherche  text,
  delai_projet    text,
  score           text default 'tiede' check (score in ('chaud','tiede','froid')),
  score_detail    text,
  resume_ia       text,
  statut          text not null default 'nouveau' check (statut in ('nouveau','contacte','rdv','converti','perdu')),
  source          text default 'widget',
  rdv_at          timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.lead_messages (
  id           uuid primary key default uuid_generate_v4(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- DOCUMENTS (Module 3)
-- ============================================================
create table public.documents (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  nom_fichier     text not null,
  storage_path    text not null,
  type_document   text default 'autre' check (type_document in ('copropriete','diagnostic','compromis','mandat','autre')),
  resume          text,
  extraction      jsonb,
  tokens_used     integer default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ESTIMATIONS (Module 4)
-- ============================================================
create table public.estimations (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  adresse         text not null,
  type_bien       text not null,
  surface         numeric not null,
  etat            text,
  etage           integer,
  equipements     text[],
  annee_construction integer,
  prix_min        numeric,
  prix_max        numeric,
  prix_median     numeric,
  rapport_html    text,
  tokens_used     integer default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- CONTACTS / CRM (Module 6)
-- ============================================================
create table public.contacts (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  created_by      uuid not null references auth.users(id),
  prenom          text not null,
  nom             text not null,
  email           text,
  telephone       text,
  type_contact    text default 'acheteur' check (type_contact in ('acheteur','vendeur','bailleur','locataire')),
  statut_pipeline text default 'prospect' check (statut_pipeline in ('prospect','qualification','visite','offre','compromis','acte','perdu')),
  budget          numeric,
  notes           text,
  last_contact_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.contact_events (
  id              uuid primary key default uuid_generate_v4(),
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  type_event      text not null check (type_event in ('note','email','appel','visite','rdv','relance')),
  contenu         text not null,
  ia_generated    boolean default false,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.annonces           enable row level security;
alter table public.leads              enable row level security;
alter table public.lead_messages      enable row level security;
alter table public.documents          enable row level security;
alter table public.estimations        enable row level security;
alter table public.contacts           enable row level security;
alter table public.contact_events     enable row level security;

-- Helper : est-ce que l'utilisateur est membre du workspace ?
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Policies workspaces
create policy "members can read workspace" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "owner can update workspace" on public.workspaces
  for update using (
    exists (select 1 from public.workspace_members
            where workspace_id = id and user_id = auth.uid() and role = 'owner')
  );

-- Policies workspace_members
create policy "members can read members" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

-- Policies annonces
create policy "members can crud annonces" on public.annonces
  for all using (public.is_workspace_member(workspace_id));

-- Policies leads
create policy "members can crud leads" on public.leads
  for all using (public.is_workspace_member(workspace_id));

create policy "members can crud lead_messages" on public.lead_messages
  for all using (public.is_workspace_member(workspace_id));

-- Policies documents
create policy "members can crud documents" on public.documents
  for all using (public.is_workspace_member(workspace_id));

-- Policies estimations
create policy "members can crud estimations" on public.estimations
  for all using (public.is_workspace_member(workspace_id));

-- Policies contacts
create policy "members can crud contacts" on public.contacts
  for all using (public.is_workspace_member(workspace_id));

create policy "members can crud contact_events" on public.contact_events
  for all using (public.is_workspace_member(workspace_id));

-- ============================================================
-- TRIGGER: updated_at auto
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.annonces
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIGGER: nouveau membre → créer workspace automatiquement
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  ws_id uuid;
  ws_slug text;
begin
  ws_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1)),
    '[^a-z0-9]', '-', 'g'
  )) || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into public.workspaces (name, slug, plan, ai_quota_limit)
  values (
    coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1)),
    ws_slug,
    'trial',
    20
  )
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
