do $$
declare
    old_id constant text := '16953b4d-bdac-439a-bb6c-a832e884eef4';
    new_id constant text := 'c3e6c518-0e2e-446d-ba08-5e5910149bde';
    policy_row record;
    statement text;
    updated_count integer := 0;
    remaining_count integer;
begin
    for policy_row in
        select schemaname, tablename, policyname, qual, with_check
        from pg_catalog.pg_policies
        where coalesce(qual, '') like '%' || old_id || '%'
           or coalesce(with_check, '') like '%' || old_id || '%'
    loop
        statement := format(
            'alter policy %I on %I.%I',
            policy_row.policyname,
            policy_row.schemaname,
            policy_row.tablename
        );

        if policy_row.qual is not null then
            statement := statement
                || format(' using (%s)', replace(policy_row.qual, old_id, new_id));
        end if;

        if policy_row.with_check is not null then
            statement := statement
                || format(' with check (%s)', replace(policy_row.with_check, old_id, new_id));
        end if;

        execute statement;
        updated_count := updated_count + 1;
    end loop;

    if updated_count = 0 then
        raise exception 'No policies referenced the old admin id; nothing was changed.';
    end if;

    select count(*)
    into remaining_count
    from pg_catalog.pg_policies
    where coalesce(qual, '') like '%' || old_id || '%'
       or coalesce(with_check, '') like '%' || old_id || '%';

    if remaining_count > 0 then
        raise exception '% policies still reference the old admin id.', remaining_count;
    end if;

    raise notice 'Updated % policies to the new admin id.', updated_count;
end
$$;
