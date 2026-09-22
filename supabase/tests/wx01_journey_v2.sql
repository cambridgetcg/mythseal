-- TEST ONLY: run against an isolated disposable local database after both migrations.
-- Never point this fixture at hosted Supabase. Synthetic users roll back.
begin;
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('de73b050-00b6-4f47-966c-abcd00000001', 'authenticated', 'authenticated', 'mythseal-sql-test-a@example.invalid', now(), now()),
  ('de73b050-00b6-4f47-966c-abcd00000002', 'authenticated', 'authenticated', 'mythseal-sql-test-b@example.invalid', now(), now());

do $$ begin
  if has_schema_privilege('authenticated', 'private_backup', 'USAGE') then raise exception 'Private schema exposed'; end if;
  if has_table_privilege('authenticated', 'private_backup.journeys_v2', 'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Direct table access exposed'; end if;
  if has_function_privilege('anon', 'public.mythseal_backup_v2_read()', 'EXECUTE') then raise exception 'Anonymous read exposed'; end if;
  if has_function_privilege('anon', 'public.mythseal_backup_v2_write(bigint,jsonb)', 'EXECUTE') then raise exception 'Anonymous write exposed'; end if;
  if has_function_privilege('anon', 'public.mythseal_backup_v2_delete(bigint)', 'EXECUTE') then raise exception 'Anonymous delete exposed'; end if;
  if not (select relrowsecurity from pg_class where oid = 'private_backup.journeys_v2'::regclass) then raise exception 'RLS not enabled'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
do $$ begin
  begin
    perform public.mythseal_backup_v2_read();
    raise exception 'Missing Auth identity was accepted';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', 'de73b050-00b6-4f47-966c-abcd00000001', true);
do $$
declare
  saved jsonb := '{"format":"mythseal.offline-journey","version":2,"profile":{"version":4,"collectionVersion":2,"collectionExpansion":2,"wx01":{},"pending":null,"marker":"a"}}';
  result jsonb;
begin
  if public.mythseal_backup_v2_read() is not null then raise exception 'New user has a backup'; end if;
  result := public.mythseal_backup_v2_write(0, saved);
  if result ->> 'revision' <> '1' or result -> 'snapshot' <> saved then raise exception 'Initial write failed'; end if;
  begin
    perform public.mythseal_backup_v2_write(0, saved);
    raise exception 'Stale initial write accepted';
  exception when sqlstate 'PT409' then null; end;
  result := public.mythseal_backup_v2_write(1, saved);
  if result ->> 'revision' <> '2' then raise exception 'Update failed'; end if;
  begin
    perform public.mythseal_backup_v2_write(2, '{"format":"other"}'::jsonb);
    raise exception 'Invalid format accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.mythseal_backup_v2_write(2, jsonb_set(saved, '{profile,pending}', '{}'::jsonb));
    raise exception 'Pending battle accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.mythseal_backup_v2_write(2, jsonb_set(saved, '{profile,oversize}', to_jsonb(repeat('x', 4194304))));
    raise exception 'Oversize backup accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.mythseal_backup_v2_write(2, null);
    raise exception 'Null write accepted';
  exception when invalid_parameter_value then null; end;
end $$;

select set_config('request.jwt.claim.sub', 'de73b050-00b6-4f47-966c-abcd00000002', true);
do $$
declare
  saved jsonb := '{"format":"mythseal.offline-journey","version":2,"profile":{"version":4,"collectionVersion":2,"collectionExpansion":2,"wx01":{},"pending":null,"marker":"b"}}';
begin
  if public.mythseal_backup_v2_read() is not null then raise exception 'Cross-account backup leaked'; end if;
  perform public.mythseal_backup_v2_write(0, saved);
  if public.mythseal_backup_v2_read() #>> '{snapshot,profile,marker}' <> 'b' then raise exception 'Second account write failed'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'de73b050-00b6-4f47-966c-abcd00000001', true);
do $$
declare
  saved jsonb := '{"format":"mythseal.offline-journey","version":2,"profile":{"version":4,"collectionVersion":2,"collectionExpansion":2,"wx01":{},"pending":null,"marker":"a"}}';
  result jsonb;
begin
  result := public.mythseal_backup_v2_read();
  if result ->> 'revision' <> '2' or result #>> '{snapshot,profile,marker}' <> 'a' then raise exception 'Cross-account mutation occurred'; end if;
  result := public.mythseal_backup_v2_delete(2);
  if result ->> 'revision' <> '3' or result -> 'snapshot' <> 'null'::jsonb then raise exception 'Tombstone failed'; end if;
  if public.mythseal_backup_v2_read() ->> 'revision' <> '3' then raise exception 'Tombstone revision lost'; end if;
  begin
    perform public.mythseal_backup_v2_write(0, saved);
    raise exception 'Delete/recreate ABA accepted';
  exception when sqlstate 'PT409' then null; end;
  begin
    perform public.mythseal_backup_v2_delete(2);
    raise exception 'Stale deletion accepted';
  exception when sqlstate 'PT409' then null; end;
  result := public.mythseal_backup_v2_write(3, saved);
  if result ->> 'revision' <> '4' then raise exception 'Recreate revision reset'; end if;
end $$;
reset role;
select 'journey_v2: grants, isolation, size, CAS and tombstones passed' as result;

-- Identical users own independent revision streams; a v1 writer cannot replace v2.
set local role authenticated;
do $$
declare
  old_saved jsonb := '{"format":"mythseal.offline-journey","version":1,"profile":{"version":3,"pending":null}}';
  before_v2 jsonb := public.mythseal_backup_v2_read();
begin
  perform public.mythseal_backup_write(0, old_saved);
  perform public.mythseal_backup_write(1, old_saved);
  if public.mythseal_backup_v2_read() <> before_v2 then raise exception 'v1 write modified v2'; end if;
  begin
    perform public.mythseal_backup_v2_write(4, old_saved);
    raise exception 'v1 payload entered v2 namespace';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.mythseal_backup_write(2, before_v2 -> 'snapshot');
    raise exception 'v2 payload entered v1 namespace';
  exception when invalid_parameter_value then null; end;
  perform public.mythseal_backup_delete(2);
  if public.mythseal_backup_v2_read() <> before_v2 then raise exception 'v1 delete modified v2'; end if;
end $$;
reset role;
rollback;
