
create or replace function public.get_or_create_analytics_session(
    p_visitor_id uuid,
    p_inactivity_seconds integer default 1800
)
returns table (
    session_id uuid,
    created boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_session_id uuid;
begin

    if p_visitor_id is null then
        raise exception 'Invalid analytics visitor';
    end if;

    if p_inactivity_seconds < 60
       or p_inactivity_seconds > 86400 then
        raise exception 'Invalid inactivity window';
    end if;




    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            p_visitor_id::text,
            0
        )
    );



    select s.id
    into v_session_id
    from public.analytics_sessions as s
    where s.visitor_id = p_visitor_id
      and s.last_seen_at >=
          now() - make_interval(secs => p_inactivity_seconds)
    order by s.last_seen_at desc
    limit 1;




    if v_session_id is not null then

        update public.analytics_sessions
        set last_seen_at = now()
        where id = v_session_id;

        return query
        select
            v_session_id,
            false;

        return;
    end if;




    v_session_id := gen_random_uuid();

    insert into public.analytics_sessions (
        id,
        visitor_id
    )
    values (
        v_session_id,
        p_visitor_id
    );


    return query
    select
        v_session_id,
        true;
end;
$$;



revoke execute
on function public.get_or_create_analytics_session(uuid, integer)
from public;

revoke execute
on function public.get_or_create_analytics_session(uuid, integer)
from anon;

revoke execute
on function public.get_or_create_analytics_session(uuid, integer)
from authenticated;

grant execute
on function public.get_or_create_analytics_session(uuid, integer)
to service_role;