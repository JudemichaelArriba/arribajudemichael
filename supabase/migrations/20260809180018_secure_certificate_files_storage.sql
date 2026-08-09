create policy "Admin can read certificate files"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'certificate-files'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can upload certificate files"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'certificate-files'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can update certificate files"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'certificate-files'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
)
with check (
    bucket_id = 'certificate-files'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can delete certificate files"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'certificate-files'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);