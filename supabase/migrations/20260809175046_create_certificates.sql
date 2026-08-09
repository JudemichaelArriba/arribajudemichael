create table public.certificates (
    id uuid primary key default gen_random_uuid(),

    slug text not null unique,

    title text not null,

    issuer text not null,

    pdf_path text,

    is_published boolean not null default false,

    display_order integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint certificates_slug_format_check
        check (
            slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    constraint certificates_title_length_check
        check (
            char_length(btrim(title))
            between 1 and 200
        ),

    constraint certificates_issuer_length_check
        check (
            char_length(btrim(issuer))
            between 1 and 200
        ),

    constraint certificates_display_order_check
        check (
            display_order >= 0
        ),

    constraint certificates_publish_requirements_check
        check (
            is_published = false
            or pdf_path is not null
        )
);


create index certificates_public_order_idx
    on public.certificates (
        is_published,
        display_order,
        created_at desc
    );


create trigger certificates_set_updated_at
before update on public.certificates
for each row
execute function public.set_updated_at();


alter table public.certificates
enable row level security;


revoke all
on table public.certificates
from anon, authenticated;


grant select
on table public.certificates
to anon;


grant select, insert, update, delete
on table public.certificates
to authenticated;


create policy "Public can view published certificates"
on public.certificates
for select
to anon
using (
    is_published = true
);


create policy "Admin can view all certificates"
on public.certificates
for select
to authenticated
using (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can create certificates"
on public.certificates
for insert
to authenticated
with check (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can update certificates"
on public.certificates
for update
to authenticated
using (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
)
with check (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can delete certificates"
on public.certificates
for delete
to authenticated
using (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);