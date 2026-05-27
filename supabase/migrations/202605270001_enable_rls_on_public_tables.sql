-- Fix Supabase Security Advisor "RLS Disabled in Public" findings.
-- These changes enable RLS without deleting data. Server-side API calls that
-- use the Supabase service role continue to bypass RLS as expected.

create or replace function public.user_has_access_to_org(org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.organizations
    where id = org_id
      and owner_id = auth.uid()
  ) or exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
end;
$$;

create or replace function public.get_user_organization_id(user_uuid uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (
    select id
    from public.organizations
    where owner_id = user_uuid
    union
    select organization_id
    from public.organization_members
    where user_id = user_uuid
    limit 1
  );
end;
$$;

alter table if exists public.user_profiles enable row level security;
alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.va_subs_tracking enable row level security;
alter table if exists public.twitter_subs_tracking enable row level security;

drop policy if exists "Users can manage own profile" on public.user_profiles;
create policy "Users can manage own profile"
  on public.user_profiles
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "view_own_org" on public.organizations;
drop policy if exists "create_org" on public.organizations;
drop policy if exists "update_own_org" on public.organizations;
drop policy if exists "delete_own_org" on public.organizations;
drop policy if exists "Users can view their own organizations" on public.organizations;
drop policy if exists "Users can create organizations" on public.organizations;
drop policy if exists "Owners can update their organizations" on public.organizations;
drop policy if exists "Owners can delete their organizations" on public.organizations;

create policy "Users can view accessible organizations"
  on public.organizations
  for select
  to authenticated
  using (owner_id = auth.uid() or public.user_has_access_to_org(id));

create policy "Users can create owned organizations"
  on public.organizations
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update organizations"
  on public.organizations
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can delete organizations"
  on public.organizations
  for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Users can view members of their organizations" on public.organization_members;
drop policy if exists "Owners can add members" on public.organization_members;
drop policy if exists "Owners can remove members" on public.organization_members;

create policy "Users can view accessible organization members"
  on public.organization_members
  for select
  to authenticated
  using (user_id = auth.uid() or public.user_has_access_to_org(organization_id));

create policy "Owners can add organization members"
  on public.organization_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.organizations
      where id = organization_id
        and owner_id = auth.uid()
    )
  );

create policy "Owners can remove organization members"
  on public.organization_members
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.organizations
      where id = organization_id
        and owner_id = auth.uid()
    )
  );

drop policy if exists "Users can manage VA subs tracking" on public.va_subs_tracking;
create policy "Users can manage VA subs tracking"
  on public.va_subs_tracking
  for all
  to authenticated
  using (public.user_has_access_to_org(organization_id))
  with check (public.user_has_access_to_org(organization_id));

drop policy if exists "Users can manage Twitter subs tracking" on public.twitter_subs_tracking;
create policy "Users can manage Twitter subs tracking"
  on public.twitter_subs_tracking
  for all
  to authenticated
  using (public.user_has_access_to_org(organization_id))
  with check (public.user_has_access_to_org(organization_id));
