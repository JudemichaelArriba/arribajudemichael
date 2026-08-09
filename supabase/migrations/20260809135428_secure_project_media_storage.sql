/*
 * Bucket:
 * project-media
 *
 * The bucket itself is PUBLIC for portfolio image viewing.
 *
 * These policies control authenticated Storage operations:
 * - SELECT/listing
 * - INSERT/upload
 * - UPDATE/replace
 * - DELETE
 */


/*
 * Allow the admin to SELECT objects from this bucket.
 *
 * SELECT permission is also required by some Storage operations
 * such as update/delete.
 */
create policy "Admin can read project media objects"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'project-media'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


/*
 * Allow only the admin to upload files.
 */
create policy "Admin can upload project media"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'project-media'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


/*
 * Allow only the admin to replace/update files.
 */
create policy "Admin can update project media"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'project-media'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
)
with check (
    bucket_id = 'project-media'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


/*
 * Allow only the admin to delete files.
 */
create policy "Admin can delete project media"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'project-media'
    and
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);