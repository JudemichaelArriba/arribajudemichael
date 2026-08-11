create or replace function public.record_analytics_engagement(
    p_session_id uuid,
    p_sections jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
    item jsonb;
    v_section_key text;
    v_view_count integer;
    v_visible_ms bigint;
    v_max_visibility numeric(5, 4);
begin

    if p_sections is null
       or jsonb_typeof(p_sections) <> 'array'
       or jsonb_array_length(p_sections) = 0
       or jsonb_array_length(p_sections) > 20 then
        raise exception 'Invalid analytics payload';
    end if;


    if not exists (
        select 1
        from public.analytics_sessions
        where id = p_session_id
    ) then
        raise exception 'Invalid analytics session';
    end if;

    for item in
        select value
        from jsonb_array_elements(p_sections)
    loop
        begin
            v_section_key := item ->> 'sectionKey';
            v_view_count := (item ->> 'viewCount')::integer;
            v_visible_ms := (item ->> 'visibleMs')::bigint;
            v_max_visibility := (item ->> 'maxVisibility')::numeric;
        exception
            when others then
                raise exception 'Invalid analytics entry';
        end;

        if v_section_key is null
           or char_length(v_section_key) < 1
           or char_length(v_section_key) > 64
           or v_section_key !~ '^[a-z0-9][a-z0-9_-]*$'
           or v_section_key = 'home'
           or v_view_count < 0
           or v_view_count > 100
           or v_visible_ms < 0
           or v_visible_ms > 1800000
           or v_max_visibility < 0
           or v_max_visibility > 1 then
            raise exception 'Invalid analytics entry';
        end if;

        insert into public.analytics_section_engagement (
            session_id,
            section_key,
            view_count,
            visible_ms,
            max_visibility
        )
        values (
            p_session_id,
            v_section_key,
            greatest(v_view_count, 1),

            v_visible_ms,
            v_max_visibility
        )

        on conflict (session_id, section_key)
        do update set
            view_count =
                public.analytics_section_engagement.view_count
                + v_view_count,

            visible_ms =
                public.analytics_section_engagement.visible_ms
                + v_visible_ms,

            max_visibility =
                greatest(
                    public.analytics_section_engagement.max_visibility,
                    v_max_visibility
                ),

            last_seen_at = now();
    end loop;
end;
$$;




revoke execute
on function public.record_analytics_engagement(uuid, jsonb)
from public;

revoke execute
on function public.record_analytics_engagement(uuid, jsonb)
from anon;

revoke execute
on function public.record_analytics_engagement(uuid, jsonb)
from authenticated;

grant execute
on function public.record_analytics_engagement(uuid, jsonb)
to service_role;