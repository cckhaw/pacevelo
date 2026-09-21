# PaceVelo MVP — System & Build Prompt for Claude Code

## 1. Project Overview & Vision
You are an expert Full-Stack Software Engineer building the MVP for **PaceVelo**—a B2B Corporate Athletic Challenge & Wellness Platform. 

PaceVelo allows HR managers at mid-market companies (100–500 employees) to spin up branded running, walking, and cycling challenges in under 5 minutes. Employees authenticate via Strava OAuth, and activity telemetry automatically populates real-time company leaderboards, team rankings, and automated Slack/MS Teams notifications.

---

## 2. Tech Stack Requirements
- **Framework:** Next.js 14+ (App Router, Server Actions, TypeScript, Tailwind CSS)
- **UI Components:** Shadcn UI + Lucide React icons
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security, Supabase Auth)
- **External Integrations:** Strava API (OAuth 2.0 & Webhooks), Slack Webhooks API
- **State & Data Fetching:** TanStack React Query (v5)
- **Deployment & Billing:** Vercel (Hosting) + Stripe (Subscriptions)

---

## 3. Core Data Schema (PostgreSQL / Supabase)

Generate and run migrations for the following schema:

```sql
-- 1. Companies (Tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  slack_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (Employees)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  department TEXT, -- e.g., 'Engineering', 'Sales', 'HR'
  strava_athlete_id BIGINT UNIQUE,
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., "Autumn Inter-Departmental Challenge"
  metric_type TEXT NOT NULL, -- 'total_distance_km', 'active_time_mins', 'elevation_m'
  allowed_activities TEXT[] NOT NULL, -- ['Run', 'Walk', 'Ride']
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Activities (Synced from Strava)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  strava_activity_id BIGINT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'Run', 'Ride', 'Walk'
  distance_meters FLOAT NOT NULL,
  moving_time_seconds INT NOT NULL,
  elevation_gain_meters FLOAT DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
