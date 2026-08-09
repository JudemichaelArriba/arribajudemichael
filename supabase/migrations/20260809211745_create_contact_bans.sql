create table public.contact_bans (
    id uuid primary key default gen_random_uuid(),

    ip_hash text not null,

    reason text not null,

    source_message_id uuid
        references public.messages(id)
        on delete set null,

    created_by uuid not null,

    created_at timestamptz not null default now(),

    expires_at timestamptz,

    revoked_at timestamptz,

    constraint contact_bans_ip_hash_check
        check (
            char_length(ip_hash) = 64
        ),

    constraint contact_bans_reason_length_check
        check (
            char_length(btrim(reason))
            between 1 and 500
        )
);


create unique index contact_bans_active_ip_idx
    on public.contact_bans (ip_hash)
    where revoked_at is null;


create index contact_bans_lookup_idx
    on public.contact_bans (
        ip_hash,
        expires_at
    )
    where revoked_at is null;


alter table public.contact_bans
enable row level security;


revoke all
on table public.contact_bans
from anon, authenticated;


grant select, insert, update, delete
on table public.contact_bans
to authenticated;


create policy "Admin can read contact bans"
on public.contact_bans
for select
to authenticated
using (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can create contact bans"
on public.contact_bans
for insert
to authenticated
with check (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can update contact bans"
on public.contact_bans
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


create policy "Admin can delete contact bans"
on public.contact_bans
for delete
to authenticated
using (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);