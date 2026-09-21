-- Storage RLS for the company-logos bucket created in 0002.
-- Objects are stored at `<company_id>/<filename>`; only an admin of that
-- company may upload/replace their own logo. The bucket is public, so
-- reads are already served without auth, but we also grant an explicit
-- select policy for clients that query via the storage API.

create policy "company_logos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'company-logos');

create policy "company_logos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.is_company_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "company_logos_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'company-logos'
    and public.is_company_admin(((storage.foldername(name))[1])::uuid)
  );
