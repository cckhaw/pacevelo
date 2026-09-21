import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  doublePrecision,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const profileRoleValues = ["employee", "admin"] as const;
export const metricTypeValues = ["total_distance_km", "active_time_mins", "elevation_m"] as const;
export const activityTypeValues = ["Run", "Ride", "Walk"] as const;

export type ProfileRole = (typeof profileRoleValues)[number];
export type MetricType = (typeof metricTypeValues)[number];
export type ActivityType = (typeof activityTypeValues)[number];

// 1. Companies (Tenants)
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  slackWebhookUrl: text("slack_webhook_url"),
  // Max challenges this company may ever create; null = unlimited. Set from
  // the onboarding code used at setup, adjustable from the back office.
  challengeLimit: integer("challenge_limit"),
  // Access cutoff for setting up new challenges; defaults to 90 days out at
  // setup time, adjustable from the back office.
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '90 days'`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Profiles (Employees + HR Admins)
// Replaces Supabase's auth.users + profiles pair with a single
// self-contained table. Every profile (employee or admin) signs up with
// a real, OTP-verified email + bcrypt password; Strava is connected as a
// separate step afterward.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  department: text("department"),
  role: text("role").$type<ProfileRole>().notNull().default("employee"),
  stravaAthleteId: bigint("strava_athlete_id", { mode: "number" }).unique(),
  stravaAccessToken: text("strava_access_token"),
  stravaRefreshToken: text("strava_refresh_token"),
  stravaTokenExpiresAt: timestamp("strava_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("profiles_email_idx").on(table.email)]);

// 3. Challenges
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  metricType: text("metric_type").$type<MetricType>().notNull(),
  allowedActivities: text("allowed_activities").array().$type<ActivityType[]>().notNull(),
  targetDepartments: text("target_departments").array(),
  // Restricts who can join via this challenge's invite link to addresses
  // ending in @<emailDomain>. Null means no restriction (kept nullable so
  // challenges created before this existed don't need backfilling).
  emailDomain: text("email_domain"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Challenge participants - explicit enrollment via a challenge's own
// invite link. A profile can be enrolled in several challenges at once;
// this is what lets a single synced activity be evaluated against every
// challenge its owner actually joined, rather than one heuristically
// "best" challenge.
export const challengeParticipants = pgTable(
  "challenge_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("challenge_participants_unique_idx").on(table.challengeId, table.profileId)],
);

// 5. Activities (synced from Strava) - one row per Strava activity,
// independent of any challenge.
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  stravaActivityId: bigint("strava_activity_id", { mode: "number" }).notNull().unique(),
  type: text("type").$type<ActivityType>().notNull(),
  distanceMeters: doublePrecision("distance_meters").notNull(),
  movingTimeSeconds: integer("moving_time_seconds").notNull(),
  elevationGainMeters: doublePrecision("elevation_gain_meters").default(0).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Which challenges a given activity counts toward. A participant can be
// enrolled in several concurrent challenges, so one workout can credit
// more than one leaderboard - the admin-facing overlap warning at
// challenge-creation time is what keeps that from being a surprise.
export const activityChallengeCredits = pgTable(
  "activity_challenge_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("activity_challenge_credits_unique_idx").on(table.activityId, table.challengeId)],
);

// 7. Short-lived email OTPs used to verify a participant's email (and
// therefore their company domain) before they can set a password and
// join a challenge.
export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  challengeId: uuid("challenge_id").references(() => challenges.id, { onDelete: "cascade" }),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Onboarding codes - alphanumeric codes generated from the back office
// that an HR admin must supply when first setting up a company. Each code
// is single-use and optionally caps how many challenges that company may
// ever create (null = unlimited).
export const onboardingCodes = pgTable("onboarding_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  challengeLimit: integer("challenge_limit"),
  usedByCompanyId: uuid("used_by_company_id").references(() => companies.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. One row per sign-in (admin login, participant login, Strava
// connect/reconnect, challenge-join signup) - powers the back office's
// "how often do people visit" stats.
export const loginEvents = pgTable(
  "login_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").$type<ProfileRole>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("login_events_profile_idx").on(table.profileId), index("login_events_occurred_at_idx").on(table.occurredAt)],
);

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  challenges: many(challenges),
}));

export const onboardingCodesRelations = relations(onboardingCodes, ({ one }) => ({
  usedByCompany: one(companies, { fields: [onboardingCodes.usedByCompanyId], references: [companies.id] }),
}));

export const loginEventsRelations = relations(loginEvents, ({ one }) => ({
  profile: one(profiles, { fields: [loginEvents.profileId], references: [profiles.id] }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  company: one(companies, { fields: [profiles.companyId], references: [companies.id] }),
  activities: many(activities),
  challengeParticipants: many(challengeParticipants),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  company: one(companies, { fields: [challenges.companyId], references: [companies.id] }),
  participants: many(challengeParticipants),
  activityCredits: many(activityChallengeCredits),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, { fields: [challengeParticipants.challengeId], references: [challenges.id] }),
  profile: one(profiles, { fields: [challengeParticipants.profileId], references: [profiles.id] }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  profile: one(profiles, { fields: [activities.profileId], references: [profiles.id] }),
  challengeCredits: many(activityChallengeCredits),
}));

export const activityChallengeCreditsRelations = relations(activityChallengeCredits, ({ one }) => ({
  activity: one(activities, { fields: [activityChallengeCredits.activityId], references: [activities.id] }),
  challenge: one(challenges, { fields: [activityChallengeCredits.challengeId], references: [challenges.id] }),
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type NewChallengeParticipant = typeof challengeParticipants.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type ActivityChallengeCredit = typeof activityChallengeCredits.$inferSelect;
export type NewActivityChallengeCredit = typeof activityChallengeCredits.$inferInsert;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type NewEmailVerification = typeof emailVerifications.$inferInsert;
export type OnboardingCode = typeof onboardingCodes.$inferSelect;
export type NewOnboardingCode = typeof onboardingCodes.$inferInsert;
export type LoginEvent = typeof loginEvents.$inferSelect;
export type NewLoginEvent = typeof loginEvents.$inferInsert;
