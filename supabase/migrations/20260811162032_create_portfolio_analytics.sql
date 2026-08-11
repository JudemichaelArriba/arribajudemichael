
create table public.analytics_sessions (
    id uuid primary key default gen_random_uuid(),

    visitor_id uuid not null,

    started_at timestamptz not null default now(),

    last_seen_at timestamptz not null default now(),

    constraint analytics_sessions_time_check
        check (
            last_seen_at >= started_at
        )
);



create index analytics_sessions_started_at_idx
    on public.analytics_sessions (
        started_at desc
    );



create index analytics_sessions_visitor_started_idx
    on public.analytics_sessions (
        visitor_id,
        started_at desc
    );



create table public.analytics_section_engagement (
    id uuid primary key default gen_random_uuid(),

    session_id uuid not null
        references public.analytics_sessions(id)
        on delete cascade,

    section_key text not null,

    view_count integer not null default 1,

    visible_ms bigint not null default 0,

    max_visibility numeric(5, 4) not null default 0,

    first_seen_at timestamptz not null default now(),

    last_seen_at timestamptz not null default now(),

    constraint analytics_section_engagement_section_length_check
        check (
            char_length(section_key)
            between 1 and 64
        ),

    constraint analytics_section_engagement_section_format_check
        check (
            section_key ~ '^[a-z0-9][a-z0-9_-]*$'
        ),

    constraint analytics_section_engagement_home_check
        check (
            section_key <> 'home'
        ),

    constraint analytics_section_engagement_view_count_check
        check (
            view_count >= 1
        ),

    constraint analytics_section_engagement_visible_ms_check
        check (
            visible_ms >= 0
        ),

    constraint analytics_section_engagement_visibility_check
        check (
            max_visibility >= 0
            and max_visibility <= 1
        ),

    constraint analytics_section_engagement_time_check
        check (
            last_seen_at >= first_seen_at
        ),

    constraint analytics_section_engagement_session_section_unique
        unique (
            session_id,
            section_key
        )
);



create index analytics_section_engagement_section_time_idx
    on public.analytics_section_engagement (
        section_key,
        first_seen_at desc
    );



create index analytics_section_engagement_first_seen_idx
    on public.analytics_section_engagement (
        first_seen_at desc
    );



alter table public.analytics_sessions
enable row level security;

alter table public.analytics_section_engagement
enable row level security;



revoke all
on table public.analytics_sessions
from anon, authenticated;

revoke all
on table public.analytics_section_engagement
from anon, authenticated;



grant select
on table public.analytics_sessions
to authenticated;

grant select
on table public.analytics_section_engagement
to authenticated;



create policy "Admin can view analytics sessions"
on public.analytics_sessions
for select
to authenticated
using (
    (select auth.uid())
    = '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);


create policy "Admin can view section engagement"
on public.analytics_section_engagement
for select
to authenticated
using (
    (select auth.uid())
    = '16953b4d-bdac-439a-bb6c-a832e884eef4'::uuid
);