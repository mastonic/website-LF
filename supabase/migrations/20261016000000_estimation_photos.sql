-- ============================================================
-- Thomas (estimation) : photos du bien et observations tirées des photos
-- Ajouts uniquement. Les fichiers sont dans le bucket privé existant « bien-media ».
-- ============================================================
alter table public.estimations
  add column if not exists photos         jsonb not null default '[]'::jsonb,
  -- [{id, path, thumb, nom}]
  add column if not exists analyse_photos jsonb;
  -- observations rédigées à partir des photos (indicatives, à confirmer sur place)
