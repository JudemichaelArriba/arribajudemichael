create or replace function public.get_analytics_period_summary(
    p_from timestamptz,
    p_to timestamptz,
    p_time_zone text default 'Asia/Manila'
)
returns table (
    unique_visitors bigint,
    sessions bigint,
    avg_daily_visitors numeric,
    avg_daily_sessions numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
    if p_from is null
       or p_to is null
       or p_to <= p_from
       or p_to - p_from > interval '5 years' then
        raise exception 'Invalid analytics time range';
    end if;

    if p_time_zone is null
       or not exists (
            select 1
            from pg_catalog.pg_timezone_names
            where name = p_time_zone
       ) then
        raise exception 'Invalid analytics time zone';
    end if;

    return query
    with day_series as (
        select generated_day::date as local_day
        from pg_catalog.generate_series(
            (p_from at time zone p_time_zone)::date,
            ((p_to - interval '1 microsecond')
                at time zone p_time_zone)::date,
            interval '1 day'
        ) as generated_day
    ),

    daily_counts as (
        select
            (s.started_at at time zone p_time_zone)::date as local_day,
            count(distinct s.visitor_id)::bigint as visitor_count,
            count(*)::bigint as session_count
        from public.analytics_sessions as s
        where s.started_at >= p_from
          and s.started_at < p_to
        group by 1
    ),

    period_totals as (
        select
            count(distinct s.visitor_id)::bigint as visitor_count,
            count(*)::bigint as session_count
        from public.analytics_sessions as s
        where s.started_at >= p_from
          and s.started_at < p_to
    )

    select
        totals.visitor_count,
        totals.session_count,

        coalesce(
            round(
                avg(
                    coalesce(days_data.visitor_count, 0)::numeric
                ),
                2
            ),
            0
        ) as avg_daily_visitors,

        coalesce(
            round(
                avg(
                    coalesce(days_data.session_count, 0)::numeric
                ),
                2
            ),
            0
        ) as avg_daily_sessions

    from period_totals as totals
    cross join day_series as days

    left join daily_counts as days_data
        on days_data.local_day = days.local_day

    group by
        totals.visitor_count,
        totals.session_count;
end;
$$;




create or replace function public.get_analytics_visitor_trend(
    p_from timestamptz,
    p_to timestamptz,
    p_bucket text,
    p_time_zone text default 'Asia/Manila'
)
returns table (
    bucket_start timestamptz,
    unique_visitors bigint,
    sessions bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
    v_step interval;
begin
    if p_from is null
       or p_to is null
       or p_to <= p_from
       or p_to - p_from > interval '5 years' then
        raise exception 'Invalid analytics time range';
    end if;

    if p_bucket not in ('day', 'week', 'month', 'year') then
        raise exception 'Invalid analytics bucket';
    end if;

    if p_time_zone is null
       or not exists (
            select 1
            from pg_catalog.pg_timezone_names
            where name = p_time_zone
       ) then
        raise exception 'Invalid analytics time zone';
    end if;

    v_step :=
        case p_bucket
            when 'day' then interval '1 day'
            when 'week' then interval '1 week'
            when 'month' then interval '1 month'
            when 'year' then interval '1 year'
        end;

    return query
    with bucket_series as (
        select generated_bucket as local_bucket
        from pg_catalog.generate_series(
            date_trunc(
                p_bucket,
                p_from at time zone p_time_zone
            ),
            date_trunc(
                p_bucket,
                (p_to - interval '1 microsecond')
                    at time zone p_time_zone
            ),
            v_step
        ) as generated_bucket
    ),

    aggregated as (
        select
            date_trunc(
                p_bucket,
                s.started_at at time zone p_time_zone
            ) as local_bucket,

            count(distinct s.visitor_id)::bigint
                as visitor_count,

            count(*)::bigint
                as session_count

        from public.analytics_sessions as s

        where s.started_at >= p_from
          and s.started_at < p_to

        group by 1
    )

    select
        (
            series.local_bucket
            at time zone p_time_zone
        ) as bucket_start,

        coalesce(data.visitor_count, 0)::bigint
            as unique_visitors,

        coalesce(data.session_count, 0)::bigint
            as sessions

    from bucket_series as series

    left join aggregated as data
        on data.local_bucket = series.local_bucket

    order by series.local_bucket;
end;
$$;




create or replace function public.get_analytics_section_summary(
    p_from timestamptz,
    p_to timestamptz
)
returns table (
    section_key text,
    unique_visitors bigint,
    sessions_reached bigint,
    total_views bigint,
    total_visible_ms bigint,
    avg_visible_ms numeric,
    avg_max_visibility numeric,
    reach_percentage numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
    if p_from is null
       or p_to is null
       or p_to <= p_from
       or p_to - p_from > interval '5 years' then
        raise exception 'Invalid analytics time range';
    end if;

    return query
    with period_sessions as (
        select
            s.id,
            s.visitor_id
        from public.analytics_sessions as s
        where s.started_at >= p_from
          and s.started_at < p_to
    ),

    period_total as (
        select
            count(distinct ps.visitor_id)::numeric
                as total_visitors
        from period_sessions as ps
    ),

    section_data as (
        select
            engagement.section_key,

            count(
                distinct sessions_data.visitor_id
            )::bigint as visitor_count,

            count(
                distinct engagement.session_id
            )::bigint as session_count,

            coalesce(
                sum(engagement.view_count),
                0
            )::bigint as view_total,

            coalesce(
                sum(engagement.visible_ms),
                0
            )::bigint as visible_total,

            round(
                avg(engagement.visible_ms::numeric),
                2
            ) as visible_average,

            round(
                avg(engagement.max_visibility),
                4
            ) as visibility_average

        from public.analytics_section_engagement
            as engagement

        inner join period_sessions as sessions_data
            on sessions_data.id = engagement.session_id

        group by engagement.section_key
    )

    select
        data.section_key,

        data.visitor_count
            as unique_visitors,

        data.session_count
            as sessions_reached,

        data.view_total
            as total_views,

        data.visible_total
            as total_visible_ms,

        data.visible_average
            as avg_visible_ms,

        data.visibility_average
            as avg_max_visibility,

        coalesce(
            round(
                (
                    data.visitor_count::numeric
                    / nullif(total.total_visitors, 0)
                ) * 100,
                2
            ),
            0
        ) as reach_percentage

    from section_data as data
    cross join period_total as total

    order by
        data.visitor_count desc,
        data.visible_average desc,
        data.section_key asc;
end;
$$;


revoke execute
on function public.get_analytics_period_summary(
    timestamptz,
    timestamptz,
    text
)
from public, anon;


revoke execute
on function public.get_analytics_visitor_trend(
    timestamptz,
    timestamptz,
    text,
    text
)
from public, anon;


revoke execute
on function public.get_analytics_section_summary(
    timestamptz,
    timestamptz
)
from public, anon;


grant execute
on function public.get_analytics_period_summary(
    timestamptz,
    timestamptz,
    text
)
to authenticated;


grant execute
on function public.get_analytics_visitor_trend(
    timestamptz,
    timestamptz,
    text,
    text
)
to authenticated;


grant execute
on function public.get_analytics_section_summary(
    timestamptz,
    timestamptz
)
to authenticated;