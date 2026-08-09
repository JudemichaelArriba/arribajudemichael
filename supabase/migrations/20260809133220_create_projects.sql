create table public.projects (
    id uuid primary key default gen_random_uuid(),

    slug text not null unique,

    title text not null,

    category text not null,

    description text not null,

    image_path text,

    image_alt text,

    github_url text,

    tags text[] not null default '{}'::text[],

    is_published boolean not null default false,

    display_order integer not null default 0,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint projects_slug_format_check
        check (
            slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    constraint projects_title_length_check
        check (
            char_length(btrim(title))
            between 1 and 120
        ),

    constraint projects_category_length_check
        check (
            char_length(btrim(category))
            between 1 and 120
        ),

    constraint projects_description_length_check
        check (
            char_length(btrim(description))
            between 1 and 2000
        ),

    constraint projects_image_alt_length_check
        check (
            image_alt is null
            or char_length(btrim(image_alt))
                between 1 and 255
        ),

    constraint projects_github_url_check
        check (
            github_url is null
            or github_url like 'https://github.com/%'
        ),

    constraint projects_display_order_check
        check (
            display_order >= 0
        ),

    constraint projects_tags_count_check
        check (
            cardinality(tags) <= 12
        ),

    constraint projects_publish_requirements_check
        check (
            is_published = false
            or (
                image_path is not null
                and image_alt is not null
                and github_url is not null
            )
        )
);


create index projects_public_order_idx
    on public.projects (
        is_published,
        display_order,
        created_at desc
    );


create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();


alter table public.projects
enable row level security;


revoke all
on table public.projects
from anon, authenticated;


grant select
on table public.projects
to anon;


grant select, insert, update, delete
on table public.projects
to authenticated;


create policy "Public can view published projects"
on public.projects
for select
to anon
using (
    is_published = true
);


create policy "Admin can view all projects"
on public.projects
for select
to authenticated
using (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can create projects"
on public.projects
for insert
to authenticated
with check (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can update projects"
on public.projects
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


create policy "Admin can delete projects"
on public.projects
for delete
to authenticated
using (
    (select auth.uid()) =
    '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);