create table public.messages (
    id uuid primary key default gen_random_uuid(),

    sender_name text not null,
    sender_email text not null,
    message text not null,

    is_read boolean not null default false,
    read_at timestamptz,

    is_starred boolean not null default false,

    is_archived boolean not null default false,
    archived_at timestamptz,

    source_ip_hash text,

    security_status text not null default 'normal',
    security_reason text,

    received_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint messages_sender_name_length_check
        check (
            char_length(btrim(sender_name))
            between 1 and 80
        ),

    constraint messages_sender_email_length_check
        check (
            char_length(btrim(sender_email))
            between 3 and 254
        ),

    constraint messages_message_length_check
        check (
            char_length(btrim(message))
            between 1 and 2000
        ),

    constraint messages_source_ip_hash_check
        check (
            source_ip_hash is null
            or char_length(source_ip_hash) = 64
        ),

    constraint messages_security_status_check
        check (
            security_status in ('normal', 'flagged')
        )
);


create index messages_inbox_idx
    on public.messages (
        is_archived,
        received_at desc
    );


create index messages_unread_idx
    on public.messages (received_at desc)
    where is_read = false
      and is_archived = false;


create index messages_starred_idx
    on public.messages (received_at desc)
    where is_starred = true
      and is_archived = false;


create trigger messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();


alter table public.messages
enable row level security;


revoke all
on table public.messages
from anon, authenticated;


grant select, update, delete
on table public.messages
to authenticated;


create policy "Admin can read messages"
on public.messages
for select
to authenticated
using (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can update messages"
on public.messages
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


create policy "Admin can delete messages"
on public.messages
for delete
to authenticated
using (
    (select auth.uid()) =
        '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);