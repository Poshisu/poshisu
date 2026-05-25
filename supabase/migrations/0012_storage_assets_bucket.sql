-- Storage buckets for app media and shared product assets.
-- 1) nourish-assets (private): user uploads and internal media
-- 2) nourish-public (public): brand/landing assets safe for public delivery

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'nourish-assets',
    'nourish-assets',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'application/pdf']
  ),
  (
    'nourish-public',
    'nourish-public',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do nothing;

-- Private bucket: users can only access their own folder prefix user_id/*
create policy "assets_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'nourish-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "assets_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'nourish-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "assets_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'nourish-assets'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'nourish-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "assets_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'nourish-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

