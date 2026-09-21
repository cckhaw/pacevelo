-- Row Level Security for all Phase 1 tables.

alter table companies enable row level security;
alter table profiles enable row level security;
alter table challenges enable row level security;
alter table activities enable row level security;

-- Security-definer helpers avoid RLS recursion when a policy needs to
-- look up the caller's own profile.
create function public.is_company_admin(target_company uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.company_id = target_company
  );
$$;

create function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------

-- Column-level grants: the public invite page (anon) only ever needs
-- enough to render a branded landing page. Signed-in members additionally
-- get the Slack webhook + timestamps for the admin settings screen.
revoke all on companies from anon, authenticated;
grant select (id, name, slug, logo_url) on companies to anon;
grant select (id, name, slug, logo_url, slack_webhook_url, created_at) on companies to authenticated;
grant insert, update on companies to authenticated;

create policy "companies_select_public"
  on companies for select
  to anon
  using (true);

create policy "companies_select_member"
  on companies for select
  to authenticated
  using (id = current_company_id() or is_company_admin(id));

create policy "companies_insert_self_admin"
  on companies for insert
  to authenticated
  with check (true);

create policy "companies_update_admin"
  on companies for update
  to authenticated
  using (is_company_admin(id))
  with check (is_company_admin(id));

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

grant select, update on profiles to authenticated;
revoke update on profiles from authenticated;
grant update (full_name, avatar_url, department, company_id) on profiles to authenticated;

create policy "profiles_select_self_or_company_admin"
  on profiles for select
  to authenticated
  using (id = auth.uid() or is_company_admin(company_id));

create policy "profiles_update_self"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- challenges
-- ---------------------------------------------------------------------

grant select, insert, update, delete on challenges to authenticated;

create policy "challenges_select_company_member"
  on challenges for select
  to authenticated
  using (company_id = current_company_id() or is_company_admin(company_id));

create policy "challenges_write_company_admin"
  on challenges for all
  to authenticated
  using (is_company_admin(company_id))
  with check (is_company_admin(company_id));

-- ---------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------

grant select, insert on activities to authenticated;

create policy "activities_select_own_or_company_admin"
  on activities for select
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from challenges c
      where c.id = activities.challenge_id
        and is_company_admin(c.company_id)
    )
  );

create policy "activities_insert_own"
  on activities for insert
  to authenticated
  with check (profile_id = auth.uid());
