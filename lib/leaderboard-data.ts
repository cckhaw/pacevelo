import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";
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
import type { ActivityType, ChallengeDataSource } from "@/db/schema";
import {
  buildDepartmentStandings,
  buildDepartmentStepStandings,
  buildIndividualStandings,
  buildIndividualStepStandings,
  type DepartmentStanding,
  type IndividualStanding,
} from "@/lib/leaderboard";

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
  let challengeList: (typeof challenges.$inferSelect)[] = [];
  let activeChallenge: (typeof challenges.$inferSelect) | null = null;

  if (options.challengeId) {
    // An explicit request for one challenge (e.g. an archived one's "final
    // leaderboard" link) is honored regardless of its date window.
    const requested = await db.query.challenges.findFirst({
      where: and(eq(challenges.id, options.challengeId), eq(challenges.companyId, company.id)),
    });
    if (requested) {
      activeChallenge = requested;
      challengeList = [requested];
    }
  }

  if (!activeChallenge) {
    challengeList = await db.query.challenges.findMany({
      where: and(
        eq(challenges.companyId, company.id),
        eq(challenges.isActive, true),
        lte(challenges.startDate, now),
        gte(challenges.endDate, now),
      ),
      orderBy: desc(challenges.startDate),
    });
    activeChallenge = challengeList[0] ?? null;
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
      avatarUrl: profiles.avatarUrl,
      department: profiles.department,
    })
    .from(challengeParticipants)
    .innerJoin(profiles, eq(challengeParticipants.profileId, profiles.id))
    .where(eq(challengeParticipants.challengeId, activeChallenge.id));

  if (activeChallenge.dataSource === "google_health") {
    // Daily step totals aren't tied to a per-challenge credit table like
    // activities are - a row is scoped to this challenge just by the
    // participant being enrolled and the day falling in its date window.
    const stepRows = await db
      .select({
        profileId: stepEntries.profileId,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
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
      avatarUrl: profiles.avatarUrl,
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
