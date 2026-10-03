-- Add photos column to annonces
alter table public.annonces
  add column if not exists photos text[] default '{}';

-- Create storage bucket for annonce photos (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'annonce-photos',
  'annonce-photos',
  true,
  5242880, -- 5MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: workspace members can upload/delete their own files
create policy "workspace members can upload annonce photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'annonce-photos');

create policy "workspace members can delete annonce photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'annonce-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "annonce photos are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'annonce-photos');
