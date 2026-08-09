create table public.experiences (
    id uuid primary key default gen_random_uuid(),

    title text not null,

    subtitle text not null,

    date_label text not null,

    description text not null,

    status text not null default 'complete',

    is_published boolean not null default false,

    display_order integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint experiences_title_length_check
        check (
            char_length(btrim(title))
            between 1 and 150
        ),

    constraint experiences_subtitle_length_check
        check (
            char_length(btrim(subtitle))
            between 1 and 120
        ),

    constraint experiences_date_label_length_check
        check (
            char_length(btrim(date_label))
            between 1 and 50
        ),

    constraint experiences_description_length_check
        check (
            char_length(btrim(description))
            between 1 and 1000
        ),

    constraint experiences_status_check
        check (
            status in ('active', 'complete')
        ),

    constraint experiences_display_order_check
        check (
            display_order >= 0
        )
);


create index experiences_public_order_idx
    on public.experiences (
        is_published,
        display_order,
        created_at desc
    );


create trigger experiences_set_updated_at
before update on public.experiences
for each row
execute function public.set_updated_at();


alter table public.experiences
enable row level security;


revoke all
on table public.experiences
from anon, authenticated;


grant select
on table public.experiences
to anon;


grant select, insert, update, delete
on table public.experiences
to authenticated;


create policy "Public can view published experiences"
on public.experiences
for select
to anon
using (
    is_published = true
);


create policy "Admin can view all experiences"
on public.experiences
for select
to authenticated
using (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can create experiences"
on public.experiences
for insert
to authenticated
with check (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can update experiences"
on public.experiences
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


create policy "Admin can delete experiences"
on public.experiences
for delete
to authenticated
using (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);