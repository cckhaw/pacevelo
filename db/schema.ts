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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Profiles (Employees + HR Admins)
// Replaces Supabase's auth.users + profiles pair with a single
// self-contained table. Employees are provisioned with a synthetic email
// and no password (they sign in via Strava only); HR admins sign up with
// a real email + bcrypt password hash.
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
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Activities (synced from Strava)
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  stravaActivityId: bigint("strava_activity_id", { mode: "number" }).notNull().unique(),
  type: text("type").$type<ActivityType>().notNull(),
  distanceMeters: doublePrecision("distance_meters").notNull(),
  movingTimeSeconds: integer("moving_time_seconds").notNull(),
  elevationGainMeters: doublePrecision("elevation_gain_meters").default(0).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  challenges: many(challenges),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  company: one(companies, { fields: [profiles.companyId], references: [companies.id] }),
  activities: many(activities),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  company: one(companies, { fields: [challenges.companyId], references: [companies.id] }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  profile: one(profiles, { fields: [activities.profileId], references: [profiles.id] }),
  challenge: one(challenges, { fields: [activities.challengeId], references: [challenges.id] }),
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
