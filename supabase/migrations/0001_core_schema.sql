-- PaceVelo core schema (see CLAUDE.md section 3)

create extension if not exists "pgcrypto";

-- 1. Companies (Tenants)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  slack_webhook_url text,
  created_at timestamptz default now()
);

-- 2. Profiles (Employees)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  full_name text not null,
  avatar_url text,
  department text, -- e.g. 'Engineering', 'Sales', 'HR'
  strava_athlete_id bigint unique,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  created_at timestamptz default now()
);

-- 3. Challenges
create table challenges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text not null, -- e.g. "Autumn Inter-Departmental Challenge"
  metric_type text not null, -- 'total_distance_km', 'active_time_mins', 'elevation_m'
  allowed_activities text[] not null, -- ['Run', 'Walk', 'Ride']
  start_date timestamptz not null,
  end_date timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Activities (synced from Strava)
create table activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  strava_activity_id bigint unique not null,
  type text not null, -- 'Run', 'Ride', 'Walk'
  distance_meters float not null,
  moving_time_seconds int not null,
  elevation_gain_meters float default 0,
  start_date timestamptz not null,
  created_at timestamptz default now()
);

create index activities_challenge_id_idx on activities (challenge_id);
create index activities_profile_id_idx on activities (profile_id);
create index challenges_company_id_idx on challenges (company_id);
create index profiles_company_id_idx on profiles (company_id);
