-- Phase 1 additions on top of the core schema: fields needed for the
-- HR Admin Portal and the employee onboarding/invite flow.

-- Distinguish HR admins from employees.
alter table profiles
  add column role text not null default 'employee'
    check (role in ('employee', 'admin'));

-- "Create Challenge" wizard lets an HR admin target specific departments.
-- Empty/null means "open to the whole company".
alter table challenges
  add column target_departments text[];

-- Auto-create a profile row whenever a Supabase auth user is created,
-- whether that's an HR admin signing up with email/password or an
-- employee created programmatically during the Strava OAuth callback.
-- Metadata is supplied by the caller (see lib/supabase/admin.ts and the
-- admin signup Server Action).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role, department, strava_athlete_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    new.raw_user_meta_data->>'department',
    nullif(new.raw_user_meta_data->>'strava_athlete_id', '')::bigint
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Public bucket for company logos uploaded from the Admin Portal.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;
