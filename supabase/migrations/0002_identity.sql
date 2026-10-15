-- ---------------------------------------------------------------------------
-- 0002_identity.sql
-- Application profile data linked to auth.users.
-- Milestone 1.
-- ---------------------------------------------------------------------------
--
-- Scope: identity only. Organization membership and roles arrive in 0003.
-- AUTHENTICATION.md section 3 is explicit that roles must NEVER live on a
-- user-editable profile row, so this table carries no role column -- by design,
-- permanently. A user can update their own profile, so any authority stored
-- here would be self-grantable privilege escalation.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for an auth.users row. Contains no authorization data; '
  'roles live in organization_members (see AUTHENTICATION.md section 3).';

-- full_name originates from user-supplied signup metadata. Bound its length at
-- the database edge so no application path can store an unbounded string.
alter table public.profiles
  add constraint profiles_full_name_length
  check (full_name is null or char_length(full_name) between 1 and 120);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Automatic profile creation
--
-- Nothing in DATABASE.md created profiles rows, leaving every new signup
-- without one. This trigger closes that gap inside the signup transaction, so
-- a profile cannot be missing for an existing user.
--
-- SECURITY NOTE: new.raw_user_meta_data is fully attacker-controlled -- it is
-- whatever the browser passed to supabase.auth.signUp({ options: { data } }).
-- It is therefore treated as untrusted input:
--
--   * Only full_name is read. Any other key the client sends is ignored, so a
--     forged `role` or `organization_id` in signup metadata has no effect.
--   * The value is trimmed, empty-to-NULL normalised, and TRUNCATED to 120
--     characters with left(). Truncating rather than rejecting matters: if an
--     over-long name raised a CHECK violation, the exception would abort the
--     enclosing auth transaction and a crafted signup payload could break
--     registration outright.
--
-- on conflict do nothing keeps the trigger idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''), 120)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a public.profiles row for each new auth.users row. Reads only '
  'full_name from client-controlled signup metadata, truncated to 120 chars.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is enabled in the same migration that creates the table, never as a
-- follow-up, so no window exists in which the table is readable unguarded.
--
-- Policy set is deliberately minimal -- SELECT and UPDATE on own row only:
--
--   * No INSERT policy. Rows are created solely by handle_new_user() above,
--     which is SECURITY DEFINER and bypasses RLS. A client that could INSERT
--     here would be able to create profile rows for other users' UUIDs.
--
--   * No DELETE policy. Deletion happens only by cascade from auth.users, so
--     account deletion stays a single auditable act rather than something a
--     user can do piecemeal.
--
--   * No cross-user SELECT. Showing teammate names on the team screen needs a
--     membership-scoped read policy, which belongs in 0003 alongside
--     organization_members. Granting it now would leak the full user table to
--     every authenticated user, including users with no organization at all.
--
-- Both policies wrap auth.uid() as `(select auth.uid())`. This is not cosmetic:
-- the subquery form is evaluated once per statement as an InitPlan instead of
-- once per row, which matters on every table that follows.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Defence in depth. Supabase grants table privileges to the `authenticated`
-- role by default, and RLS only filters rows for operations the role may
-- perform at all. Revoking the privileges outright means a future policy added
-- by mistake still cannot enable client-side inserts or deletes here.
revoke insert, delete, truncate on public.profiles from authenticated;
revoke all on public.profiles from anon;
