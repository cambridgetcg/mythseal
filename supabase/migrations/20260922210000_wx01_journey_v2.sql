-- Additive schema only: v1 rows, revisions and RPCs remain unchanged.
-- Apply and verify separately before enabling JOURNEY_V2_ENABLED on the Worker.
-- Private, untrusted offline-game backups. These rows never authorize game
-- economy, card ownership, trading, rewards or minting.
create schema if not exists private_backup;
revoke all on schema private_backup from public, anon, authenticated;

create function private_backup.valid_snapshot_v2(snapshot jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    pg_catalog.jsonb_typeof(snapshot) = 'object'
    and pg_catalog.octet_length(snapshot::text) <= 4194304
    and snapshot ->> 'format' = 'mythseal.offline-journey'
    and snapshot -> 'version' = '2'::jsonb
    and pg_catalog.jsonb_typeof(snapshot -> 'profile') = 'object'
    and snapshot #> '{profile,version}' = '4'::jsonb
    and snapshot #> '{profile,collectionVersion}' = '2'::jsonb
    and snapshot #> '{profile,collectionExpansion}' = '2'::jsonb
    and pg_catalog.jsonb_typeof(snapshot #> '{profile,wx01}') = 'object'
    and snapshot #> '{profile,pending}' = 'null'::jsonb,
    false
  )
$$;
revoke all on function private_backup.valid_snapshot_v2(jsonb) from public, anon, authenticated;

create table private_backup.journeys_v2 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb,
  revision bigint not null check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint valid_offline_journey_v2 check (snapshot is null or private_backup.valid_snapshot_v2(snapshot))
);
comment on table private_backup.journeys_v2 is 'Untrusted account-private offline saves; null snapshot is a CAS tombstone, not game inventory.';
alter table private_backup.journeys_v2 enable row level security;
create policy journey_v2_owner on private_backup.journeys_v2
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on table private_backup.journeys_v2 from public, anon, authenticated;

create function public.mythseal_backup_v2_read()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  result jsonb;
begin
  if actor is null then raise exception using errcode = '42501', message = 'Sign-in required'; end if;
  select pg_catalog.jsonb_build_object('revision', j.revision, 'updatedAt', j.updated_at, 'snapshot', j.snapshot)
    into result from private_backup.journeys_v2 j where j.user_id = actor;
  return result;
end
$$;

create function private_backup.mutate_journey_v2(p_expected_revision bigint, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  previous_revision bigint;
  result jsonb;
begin
  if actor is null then raise exception using errcode = '42501', message = 'Sign-in required'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991 then
    raise exception using errcode = '22023', message = 'Invalid revision';
  end if;
  if p_snapshot is not null and not private_backup.valid_snapshot_v2(p_snapshot) then
    raise exception using errcode = '22023', message = 'Invalid offline snapshot';
  end if;
  -- Serialize even the first insert. Row locks alone cannot lock a missing row.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 9222026));
  select j.revision into previous_revision from private_backup.journeys_v2 j where j.user_id = actor for update;
  if coalesce(previous_revision, 0) <> p_expected_revision then
    raise exception using errcode = 'PT409', message = 'Cloud revision changed';
  end if;
  insert into private_backup.journeys_v2 as j (user_id, snapshot, revision, updated_at)
    values (actor, p_snapshot, p_expected_revision + 1, pg_catalog.clock_timestamp())
    on conflict (user_id) do update set snapshot = excluded.snapshot,
      revision = excluded.revision, updated_at = excluded.updated_at
    returning pg_catalog.jsonb_build_object('revision', j.revision, 'updatedAt', j.updated_at, 'snapshot', j.snapshot) into result;
  return result;
end
$$;
revoke all on function private_backup.mutate_journey_v2(bigint, jsonb) from public, anon, authenticated;

create function public.mythseal_backup_v2_write(p_expected_revision bigint, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_snapshot is null then raise exception using errcode = '22023', message = 'Snapshot required'; end if;
  return private_backup.mutate_journey_v2(p_expected_revision, p_snapshot);
end
$$;

create function public.mythseal_backup_v2_delete(p_expected_revision bigint)
returns jsonb language sql security definer set search_path = '' as $$
  select private_backup.mutate_journey_v2(p_expected_revision, null)
$$;

revoke all on function public.mythseal_backup_v2_read() from public, anon, authenticated;
revoke all on function public.mythseal_backup_v2_write(bigint, jsonb) from public, anon, authenticated;
revoke all on function public.mythseal_backup_v2_delete(bigint) from public, anon, authenticated;
grant execute on function public.mythseal_backup_v2_read() to authenticated;
grant execute on function public.mythseal_backup_v2_write(bigint, jsonb) to authenticated;
grant execute on function public.mythseal_backup_v2_delete(bigint) to authenticated;

notify pgrst, 'reload schema';
