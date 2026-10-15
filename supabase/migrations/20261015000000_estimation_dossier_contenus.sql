-- ============================================================
-- Thomas (estimation) : dossier d'estimation + suivi de l'issue
-- Chloé (réseaux)     : contenus générés et leur statut
-- Ajouts uniquement : aucune colonne ni table existante n'est supprimée.
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- ESTIMATIONS ----------
alter table public.estimations
  add column if not exists lat             double precision,
  add column if not exists lon             double precision,
  add column if not exists code_insee      text,
  add column if not exists pieces          integer,
  add column if not exists travaux         jsonb not null default '[]'::jsonb,
  -- [{id, label, montant, note}]
  add column if not exists ajustements     jsonb not null default '[]'::jsonb,
  -- [{id, label, type: 'pct'|'eur', valeur}]
  add column if not exists notes           text,
  add column if not exists prix_concurrent numeric,
  -- autre avis de valeur reçu par le vendeur (pour se situer, jamais pour le critiquer)
  add column if not exists resultat        jsonb,
  -- résultat des ventes officielles (DVF) : fourchette, comparables, tendance
  add column if not exists scenarios       jsonb,
  -- prix « en l'état » calculés : vente rapide / marché / essai
  add column if not exists rapport         jsonb,
  -- compte rendu rédigé (sections de texte)
  add column if not exists issue           text not null default 'en_cours',
  add column if not exists raison_perte    text,
  add column if not exists issue_at        timestamptz,
  add column if not exists updated_at      timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'estimations_issue_check') then
    alter table public.estimations
      add constraint estimations_issue_check
      check (issue in ('en_cours', 'mandat_signe', 'mandat_perdu', 'abandonne'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estimations_raison_perte_check') then
    alter table public.estimations
      add constraint estimations_raison_perte_check
      check (raison_perte is null or raison_perte in
        ('estimation_plus_haute_ailleurs', 'autre_agence_choisie', 'vendeur_renonce', 'vendeur_reporte', 'autre'));
  end if;
end $$;

create index if not exists estimations_workspace_created_idx
  on public.estimations (workspace_id, created_at desc);

drop trigger if exists set_updated_at on public.estimations;
create trigger set_updated_at
  before update on public.estimations
  for each row execute function public.handle_updated_at();

-- ---------- CONTENUS (réseaux) ----------
create table if not exists public.contenus (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  created_by    uuid not null references auth.users(id),
  idee          text not null,
  format        text not null check (format in ('video', 'texte')),
  plateforme    text,
  titre         text,
  contenu       jsonb not null default '{}'::jsonb,
  statut        text not null default 'brouillon' check (statut in ('brouillon', 'publie', 'abandonne')),
  publie_le     timestamptz,
  fournisseur   text,
  tokens_used   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists contenus_workspace_created_idx
  on public.contenus (workspace_id, created_at desc);

alter table public.contenus enable row level security;

drop policy if exists "members can crud contenus" on public.contenus;
create policy "members can crud contenus" on public.contenus
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop trigger if exists set_updated_at on public.contenus;
create trigger set_updated_at
  before update on public.contenus
  for each row execute function public.handle_updated_at();
