-- ---------------------------------------------------------------------------
-- 0001_helpers.sql
-- Table-independent helper functions shared by later migrations.
-- Milestone 1.
-- ---------------------------------------------------------------------------
--
-- NOTE ON MIGRATION ORDERING (correction to the original plan):
--
-- The multi-tenancy RLS helpers -- is_org_member(), has_org_role() and
-- has_client_access() -- were originally planned to live in this migration.
-- They cannot. A `language sql` function body is parsed and validated when the
-- function is CREATEd, so a helper that selects from public.organization_members
-- fails here because that table does not exist until 0003.
--
-- Those helpers are therefore defined in the migration that creates the table
-- they query, immediately before the policies that call them:
--
--   0003_organizations.sql -> is_org_member(), has_org_role()
--   0005_clients.sql       -> has_client_access()
--
-- Do not move them back into 0001. `language plpgsql` would defer validation
-- and appear to work, but it forfeits inlining into the query plan, and an
-- RLS helper runs on every row of every tenant query.
--
-- gen_random_uuid() is built into PostgreSQL 13+; the pgcrypto extension is
-- not required.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- set_updated_at()
--
-- Maintains updated_at on UPDATE. DATABASE.md declares updated_at on several
-- tables with `default now()`, which only applies on INSERT -- without this
-- trigger the column silently records the creation time forever.
--
-- search_path is pinned to '' so that a malicious schema earlier on a caller's
-- search_path cannot shadow anything referenced here. now() resolves from
-- pg_catalog, which is always implicitly present.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at on UPDATE. Attach per table with: '
  'create trigger <table>_set_updated_at before update on <table> '
  'for each row execute function public.set_updated_at();';
