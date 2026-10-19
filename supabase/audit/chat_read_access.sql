-- Read-only audit for the Ask assistant's data boundary. Run in the Supabase SQL editor.
-- It changes nothing: every statement is a SELECT against the catalog.
--
-- The assistant reads projects, experiences and certificates through the publishable key
-- (the `anon` role) and relies on RLS to see only published rows. Expected results are noted
-- above each query; anything else is a finding to fix in a migration.


-- 1. RLS must be enabled on every table in the public schema.
--    Expected: zero rows.
select c.relname as table_without_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity;


-- 2. Policies that apply to anon on the tables the assistant reads.
--    Expected: exactly one SELECT policy per table, using (is_published = true).
select tablename, policyname, cmd, roles, qual
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('projects', 'experiences', 'certificates')
  and ('anon' = any (roles) or 'public' = any (roles))
order by tablename, policyname;


-- 3. anon may only SELECT the three portfolio tables.
--    Expected: can_select = true and every write column = false for all three rows.
select
    t.table_name,
    has_table_privilege('anon', format('public.%I', t.table_name), 'SELECT') as can_select,
    has_table_privilege('anon', format('public.%I', t.table_name), 'INSERT') as can_insert,
    has_table_privilege('anon', format('public.%I', t.table_name), 'UPDATE') as can_update,
    has_table_privilege('anon', format('public.%I', t.table_name), 'DELETE') as can_delete,
    has_table_privilege('anon', format('public.%I', t.table_name), 'TRUNCATE') as can_truncate
from information_schema.tables t
where t.table_schema = 'public'
  and t.table_name in ('projects', 'experiences', 'certificates')
order by t.table_name;


-- 4. No other public table is readable or writable by anon (contact bans, analytics, ...).
--    Expected: zero rows.
select t.table_name, p.privilege_type
from information_schema.tables t
join information_schema.table_privileges p
  on p.table_schema = t.table_schema
 and p.table_name = t.table_name
where t.table_schema = 'public'
  and t.table_name not in ('projects', 'experiences', 'certificates')
  and p.grantee in ('anon', 'PUBLIC')
order by t.table_name, p.privilege_type;


-- 5. Functions anon can execute in the public schema.
--    Expected: none that the assistant needs; review any row that appears.
select p.proname as function_name, pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and has_function_privilege('anon', p.oid, 'EXECUTE')
order by p.proname;
