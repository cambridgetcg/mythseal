-- A stale client revision is a permanent HTTP conflict, not a retryable
-- serialization failure. PostgREST retries SQLSTATE 40001 internally.
create or replace function private_backup.mutate_journey(p_expected_revision bigint, p_snapshot jsonb)
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
  if p_snapshot is not null and not private_backup.valid_snapshot(p_snapshot) then
    raise exception using errcode = '22023', message = 'Invalid offline snapshot';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 9212026));
  select j.revision into previous_revision from private_backup.journeys j where j.user_id = actor for update;
  if coalesce(previous_revision, 0) <> p_expected_revision then
    raise sqlstate 'PT409' using message = 'Cloud revision changed';
  end if;
  insert into private_backup.journeys as j (user_id, snapshot, revision, updated_at)
    values (actor, p_snapshot, p_expected_revision + 1, pg_catalog.clock_timestamp())
    on conflict (user_id) do update set snapshot = excluded.snapshot,
      revision = excluded.revision, updated_at = excluded.updated_at
    returning pg_catalog.jsonb_build_object('revision', j.revision, 'updatedAt', j.updated_at, 'snapshot', j.snapshot) into result;
  return result;
end
$$;
revoke all on function private_backup.mutate_journey(bigint, jsonb) from public, anon, authenticated;
notify pgrst, 'reload schema';
