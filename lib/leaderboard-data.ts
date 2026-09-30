import "server-only";

import { and, asc, eq, desc, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  activityChallengeCredits,
  challengeParticipants,
  challenges,
  companies,
  profiles,
  stepEntries,
} from "@/db/schema";
import type { ActivityType, ChallengeDataSource, MetricType } from "@/db/schema";
import {
  buildDepartmentStandings,
  buildDepartmentStepStandings,
  buildIndividualStandings,
  buildIndividualStepStandings,
  metricValue,
  type DepartmentStanding,
  type IndividualStanding,
} from "@/lib/leaderboard";
import { isStepsDataSource } from "@/lib/validations";

export interface SerializedChallenge {
  id: string;
  title: string;
  dataSource: ChallengeDataSource;
  metricType: typeof challenges.$inferSelect.metricType;
  allowedActivities: ActivityType[];
  startDate: string;
  endDate: string;
  // Prize description per top-N individual rank (index 0 = 1st place).
  prizes: string[];
}

export interface LeaderboardData {
  company: { name: string; slug: string; logoUrl: string | null } | null;
  challenges: SerializedChallenge[];
  activeChallenge: SerializedChallenge | null;
  individual: IndividualStanding[];
  departmental: DepartmentStanding[];
}

function serializeChallenge(challenge: typeof challenges.$inferSelect): SerializedChallenge {
  return {
    id: challenge.id,
    title: challenge.title,
    dataSource: challenge.dataSource,
    metricType: challenge.metricType,
    allowedActivities: challenge.allowedActivities,
    startDate: challenge.startDate.toISOString(),
    endDate: challenge.endDate.toISOString(),
    prizes: challenge.prizes ?? [],
  };
}

export async function getLeaderboardData(
  slug: string,
  options: { challengeId?: string; activityType?: ActivityType | null } = {},
): Promise<LeaderboardData> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
    columns: { id: true, name: true, slug: true, logoUrl: true },
  });
  if (!company) {
    return { company: null, challenges: [], activeChallenge: null, individual: [], departmental: [] };
  }

  const now = new Date();
  // The dropdown's full option list - every currently-active challenge,
  // fetched unconditionally so picking one from it (which re-requests with
  // an explicit challengeId, below) doesn't make the dropdown itself
  // collapse to just the one selected challenge on the next fetch.
  let challengeList = await db.query.challenges.findMany({
    where: and(
      eq(challenges.companyId, company.id),
      eq(challenges.isActive, true),
      lte(challenges.startDate, now),
      gte(challenges.endDate, now),
    ),
    orderBy: desc(challenges.startDate),
  });
  let activeChallenge: (typeof challenges.$inferSelect) | null = challengeList[0] ?? null;

  if (options.challengeId) {
    // An explicit request for one challenge (e.g. an archived one's "final
    // leaderboard" link) is honored regardless of its date window.
    const requested = await db.query.challenges.findFirst({
      where: and(eq(challenges.id, options.challengeId), eq(challenges.companyId, company.id)),
    });
    if (requested) {
      activeChallenge = requested;
      // Keep it selectable even if it's outside the currently-active list
      // (e.g. already ended) - the dropdown still shows every other active
      // challenge alongside it, rather than shrinking to just this one.
      if (!challengeList.some((c) => c.id === requested.id)) {
        challengeList = [requested, ...challengeList];
      }
    }
  }

  if (!activeChallenge) {
    return {
      company: { name: company.name, slug: company.slug, logoUrl: company.logoUrl },
      challenges: [],
      activeChallenge: null,
      individual: [],
      departmental: [],
    };
  }

  const roster = await db
    .select({
      profileId: challengeParticipants.profileId,
      fullName: profiles.fullName,
      department: profiles.department,
    })
    .from(challengeParticipants)
    .innerJoin(profiles, eq(challengeParticipants.profileId, profiles.id))
    .where(eq(challengeParticipants.challengeId, activeChallenge.id));

  if (isStepsDataSource(activeChallenge.dataSource)) {
    // Daily step totals aren't tied to a per-challenge credit table like
    // activities are - a row is scoped to this challenge just by the
    // participant being enrolled and the day falling in its date window.
    const stepRows = await db
      .select({
        profileId: stepEntries.profileId,
        fullName: profiles.fullName,
        department: profiles.department,
        steps: stepEntries.steps,
      })
      .from(challengeParticipants)
      .innerJoin(stepEntries, eq(challengeParticipants.profileId, stepEntries.profileId))
      .innerJoin(profiles, eq(stepEntries.profileId, profiles.id))
      .where(
        and(
          eq(challengeParticipants.challengeId, activeChallenge.id),
          gte(stepEntries.day, activeChallenge.startDate),
          lte(stepEntries.day, activeChallenge.endDate),
        ),
      );

    return {
      company: { name: company.name, slug: company.slug, logoUrl: company.logoUrl },
      challenges: challengeList.map(serializeChallenge),
      activeChallenge: serializeChallenge(activeChallenge),
      individual: buildIndividualStepStandings(roster, stepRows),
      departmental: buildDepartmentStepStandings(roster, stepRows),
    };
  }

  const rows = await db
    .select({
      profileId: activities.profileId,
      fullName: profiles.fullName,
      department: profiles.department,
      type: activities.type,
      distanceMeters: activities.distanceMeters,
      movingTimeSeconds: activities.movingTimeSeconds,
      elevationGainMeters: activities.elevationGainMeters,
    })
    .from(activityChallengeCredits)
    .innerJoin(activities, eq(activityChallengeCredits.activityId, activities.id))
    .innerJoin(profiles, eq(activities.profileId, profiles.id))
    .where(
      options.activityType
        ? and(eq(activityChallengeCredits.challengeId, activeChallenge.id), eq(activities.type, options.activityType))
        : eq(activityChallengeCredits.challengeId, activeChallenge.id),
    );

  return {
    company: { name: company.name, slug: company.slug, logoUrl: company.logoUrl },
    challenges: challengeList.map(serializeChallenge),
    activeChallenge: serializeChallenge(activeChallenge),
    individual: buildIndividualStandings(roster, rows, activeChallenge.metricType),
    departmental: buildDepartmentStandings(roster, rows, activeChallenge.metricType),
  };
}

export interface ParticipantDayBreakdown {
  date: string; // "YYYY-MM-DD", UTC calendar day
  value: number;
  activityCount: number;
}

export interface ParticipantBreakdown {
  profileId: string;
  fullName: string;
  department: string | null;
  metricType: MetricType;
  totalValue: number;
  days: ParticipantDayBreakdown[];
}

/**
 * A single participant's day-by-day progress within one challenge, so
 * teammates can see how someone else's total built up rather than just the
 * final number - powers clicking a name on the leaderboard. Scoped to a
 * specific challenge (not "all activity ever") and restricted to profiles
 * actually enrolled in it, mirroring getLeaderboardData's roster.
 */
export async function getParticipantBreakdown(
  slug: string,
  challengeId: string,
  profileId: string,
): Promise<ParticipantBreakdown | null> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
    columns: { id: true },
  });
  if (!company) return null;

  const challenge = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, challengeId), eq(challenges.companyId, company.id)),
  });
  if (!challenge) return null;

  const [participant] = await db
    .select({
      profileId: challengeParticipants.profileId,
      fullName: profiles.fullName,
      department: profiles.department,
    })
    .from(challengeParticipants)
    .innerJoin(profiles, eq(challengeParticipants.profileId, profiles.id))
    .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.profileId, profileId)));
  if (!participant) return null;

  if (isStepsDataSource(challenge.dataSource)) {
    const stepRows = await db
      .select({ day: stepEntries.day, steps: stepEntries.steps })
      .from(stepEntries)
      .where(
        and(
          eq(stepEntries.profileId, profileId),
          gte(stepEntries.day, challenge.startDate),
          lte(stepEntries.day, challenge.endDate),
        ),
      )
      .orderBy(asc(stepEntries.day));

    // Grouped defensively by calendar day rather than mapped 1:1 from rows:
    // every writer (lib/device-sync.ts, lib/google-health/sync.ts) always
    // upserts one midnight-UTC-anchored row per profile per day, so this
    // doesn't normally collapse anything, but it keeps a stray/legacy
    // non-anchored row from producing two entries for what's really the
    // same day (which would both inflate the total and give the day list a
    // duplicate key).
    const byDay = new Map<string, { value: number; activityCount: number }>();
    for (const row of stepRows) {
      const date = row.day.toISOString().slice(0, 10);
      const entry = byDay.get(date) ?? { value: 0, activityCount: 0 };
      entry.value += row.steps;
      entry.activityCount += 1;
      byDay.set(date, entry);
    }
    const days = [...byDay.entries()]
      .map(([date, d]) => ({ date, value: d.value, activityCount: d.activityCount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      ...participant,
      metricType: challenge.metricType,
      totalValue: days.reduce((sum, d) => sum + d.value, 0),
      days,
    };
  }

  const activityRows = await db
    .select({
      distanceMeters: activities.distanceMeters,
      movingTimeSeconds: activities.movingTimeSeconds,
      elevationGainMeters: activities.elevationGainMeters,
      startDate: activities.startDate,
    })
    .from(activityChallengeCredits)
    .innerJoin(activities, eq(activityChallengeCredits.activityId, activities.id))
    .where(and(eq(activityChallengeCredits.challengeId, challengeId), eq(activities.profileId, profileId)));

  const byDay = new Map<string, { value: number; activityCount: number }>();
  for (const row of activityRows) {
    const date = row.startDate.toISOString().slice(0, 10);
    const entry = byDay.get(date) ?? { value: 0, activityCount: 0 };
    entry.value += metricValue(row, challenge.metricType);
    entry.activityCount += 1;
    byDay.set(date, entry);
  }

  const days = [...byDay.entries()]
    .map(([date, d]) => ({ date, value: d.value, activityCount: d.activityCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...participant,
    metricType: challenge.metricType,
    totalValue: days.reduce((sum, d) => sum + d.value, 0),
    days,
  };
}

export interface EmployeeChallengeProgress {
  challengeId: string;
  title: string;
  metricType: MetricType;
  dataSource: ChallengeDataSource;
  isActive: boolean;
  value: number;
}

export interface EmployeeProgress {
  profileId: string;
  fullName: string;
  email: string;
  department: string | null;
  challenges: EmployeeChallengeProgress[];
}

/**
 * Every employee in a company, and their progress in each challenge
 * they've joined - powers the admin "all employees" view. Mirrors
 * getLeaderboardData's two scoring pipelines (Strava activity credits vs.
 * step entries, shared by both step-based data sources), but per-challenge
 * across the whole company rather than for one active challenge.
 */
export async function getCompanyEmployeeProgress(companyId: string): Promise<EmployeeProgress[]> {
  const [employees, companyChallenges] = await Promise.all([
    db.query.profiles.findMany({
      where: and(eq(profiles.companyId, companyId), eq(profiles.role, "employee")),
      orderBy: (p, { asc }) => [asc(p.fullName)],
    }),
    db.query.challenges.findMany({ where: eq(challenges.companyId, companyId) }),
  ]);

  const challengeById = new Map(companyChallenges.map((c) => [c.id, c]));
  const companyChallengeIds = companyChallenges.map((c) => c.id);

  const participantRows = companyChallengeIds.length
    ? await db
        .select({ profileId: challengeParticipants.profileId, challengeId: challengeParticipants.challengeId })
        .from(challengeParticipants)
        .where(inArray(challengeParticipants.challengeId, companyChallengeIds))
    : [];

  const valueByChallengeAndProfile = new Map<string, Map<string, number>>();
  function addValue(challengeId: string, profileId: string, amount: number) {
    const byProfile = valueByChallengeAndProfile.get(challengeId) ?? new Map<string, number>();
    byProfile.set(profileId, (byProfile.get(profileId) ?? 0) + amount);
    valueByChallengeAndProfile.set(challengeId, byProfile);
  }

  const stravaChallengeIds = companyChallenges.filter((c) => c.dataSource === "strava").map((c) => c.id);
  if (stravaChallengeIds.length > 0) {
    const activityRows = await db
      .select({
        challengeId: activityChallengeCredits.challengeId,
        profileId: activities.profileId,
        distanceMeters: activities.distanceMeters,
        movingTimeSeconds: activities.movingTimeSeconds,
        elevationGainMeters: activities.elevationGainMeters,
      })
      .from(activityChallengeCredits)
      .innerJoin(activities, eq(activityChallengeCredits.activityId, activities.id))
      .where(inArray(activityChallengeCredits.challengeId, stravaChallengeIds));

    for (const row of activityRows) {
      const challenge = challengeById.get(row.challengeId);
      if (!challenge) continue;
      addValue(row.challengeId, row.profileId, metricValue(row, challenge.metricType));
    }
  }

  for (const challenge of companyChallenges) {
    if (!isStepsDataSource(challenge.dataSource)) continue;
    const stepRows = await db
      .select({ profileId: stepEntries.profileId, steps: stepEntries.steps })
      .from(challengeParticipants)
      .innerJoin(stepEntries, eq(challengeParticipants.profileId, stepEntries.profileId))
      .where(
        and(
          eq(challengeParticipants.challengeId, challenge.id),
          gte(stepEntries.day, challenge.startDate),
          lte(stepEntries.day, challenge.endDate),
        ),
      );
    for (const row of stepRows) {
      addValue(challenge.id, row.profileId, row.steps);
    }
  }

  const challengeIdsByProfile = new Map<string, string[]>();
  for (const row of participantRows) {
    const list = challengeIdsByProfile.get(row.profileId) ?? [];
    list.push(row.challengeId);
    challengeIdsByProfile.set(row.profileId, list);
  }

  const now = Date.now();
  return employees.map((employee) => {
    const employeeChallenges = (challengeIdsByProfile.get(employee.id) ?? [])
      .map((id) => challengeById.get(id))
      .filter((c): c is typeof challenges.$inferSelect => Boolean(c))
      .map((c) => ({
        challengeId: c.id,
        title: c.title,
        metricType: c.metricType,
        dataSource: c.dataSource,
        isActive: c.isActive && c.endDate.getTime() >= now,
        value: valueByChallengeAndProfile.get(c.id)?.get(employee.id) ?? 0,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return {
      profileId: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      challenges: employeeChallenges,
    };
  });
}
