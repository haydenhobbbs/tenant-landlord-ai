-- Run after schema.sql. Browser clients use the signed-in user's JWT.
-- Review alongside teammate A's auth policies before applying to the shared project.

create policy "landlords manage own contractors" on public.contractors
  for all to authenticated
  using (landlord_id = (select auth.uid()))
  with check (landlord_id = (select auth.uid()));

create policy "request participants read own requests" on public.requests
  for select to authenticated
  using (landlord_id = (select auth.uid()) or tenant_id = (select auth.uid()));

create policy "landlords read own properties" on public.properties
  for select to authenticated
  using (landlord_id = (select auth.uid()));

create policy "landlords read own leases" on public.leases
  for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and p.landlord_id = (select auth.uid())
  ));

create policy "request participants read messages" on public.messages
  for select to authenticated
  using (request_id is not null and exists (
    select 1 from public.requests r
    where r.id = request_id
      and (r.landlord_id = (select auth.uid()) or r.tenant_id = (select auth.uid()))
  ));

create policy "request participants send messages" on public.messages
  for insert to authenticated
  with check (request_id is not null and sender_id = (select auth.uid()) and
    length(trim(body)) > 0 and length(body) <= 5000 and exists (
      select 1 from public.requests r
      where r.id = request_id and r.landlord_id is not null and r.tenant_id is not null
        and (r.landlord_id = (select auth.uid()) or r.tenant_id = (select auth.uid()))
    ));

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('leases', 'leases', false) on conflict (id) do nothing;

-- Put PDFs under <landlord auth user ID>/<filename> and store that path in leases.file_url.
create policy "landlords read own lease files" on storage.objects
  for select to authenticated
  using (bucket_id = 'leases' and (storage.foldername(name))[1] = (select auth.uid())::text);
