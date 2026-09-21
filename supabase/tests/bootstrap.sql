-- TEST ONLY. This models just the Auth surface needed by the backup migration on
-- an isolated vanilla PostgreSQL database. Never apply to hosted Supabase.
do $$ begin
  if current_database() <> 'mythseal_test' then
    raise exception 'Test bootstrap requires database mythseal_test';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    raise exception 'Test bootstrap refuses an existing auth schema';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create table auth.users (
  id uuid primary key,
  aud text,
  role text,
  email text,
  created_at timestamptz,
  updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
