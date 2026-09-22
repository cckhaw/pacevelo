import "server-only";

import { and, count, countDistinct, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { challengeParticipants, challenges, companies, loginEvents, profiles } from "@/db/schema";
import type { ProfileRole } from "@/db/schema";

async function employeeCountFor(companyId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(profiles)
    .where(and(eq(profiles.companyId, companyId), eq(profiles.role, "employee")));
  return value;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Counts login events by role within a time window, optionally scoped to one company. */
async function loginCounts(companyId?: string) {
  const since7d = new Date(Date.now() - 7 * DAY_MS);
  const since30d = new Date(Date.now() - 30 * DAY_MS);

  async function countFor(role: ProfileRole, since: Date): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(loginEvents)
      .innerJoin(profiles, eq(loginEvents.profileId, profiles.id))
      .where(
        and(
          eq(loginEvents.role, role),
          gte(loginEvents.occurredAt, since),
          companyId ? eq(profiles.companyId, companyId) : undefined,
        ),
      );
    return value;
  }

  const [admin7d, employee7d, admin30d, employee30d] = await Promise.all([
    countFor("admin", since7d),
    countFor("employee", since7d),
    countFor("admin", since30d),
    countFor("employee", since30d),
  ]);

  return { admin7d, employee7d, admin30d, employee30d };
}

export async function getBackofficeOverview() {
  const [[{ value: companyCount }], [{ value: challengeCount }], [{ value: participantCount }], logins] =
    await Promise.all([
      db.select({ value: count() }).from(companies),
      db.select({ value: count() }).from(challenges),
      db.select({ value: countDistinct(challengeParticipants.profileId) }).from(challengeParticipants),
      loginCounts(),
    ]);

  return { companyCount, challengeCount, participantCount, logins };
}

export interface CompanyOverviewRow {
  id: string;
  name: string;
  slug: string;
  challengeLimit: number | null;
  employeeLimit: number;
  expiresAt: Date;
  challengeCount: number;
  participantCount: number;
  employeeCount: number;
}

export async function getCompaniesOverview(): Promise<CompanyOverviewRow[]> {
  const [companyRows, challengeCounts, participantCounts, employeeCounts] = await Promise.all([
    db.query.companies.findMany({ orderBy: desc(companies.createdAt) }),
    db.select({ companyId: challenges.companyId, value: count() }).from(challenges).groupBy(challenges.companyId),
    db
      .select({ companyId: challenges.companyId, value: countDistinct(challengeParticipants.profileId) })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .groupBy(challenges.companyId),
    db
      .select({ companyId: profiles.companyId, value: count() })
      .from(profiles)
      .where(eq(profiles.role, "employee"))
      .groupBy(profiles.companyId),
  ]);

  const challengeCountByCompany = new Map(challengeCounts.map((r) => [r.companyId, r.value]));
  const participantCountByCompany = new Map(participantCounts.map((r) => [r.companyId, r.value]));
  const employeeCountByCompany = new Map(employeeCounts.map((r) => [r.companyId, r.value]));

  return companyRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    challengeLimit: c.challengeLimit,
    employeeLimit: c.employeeLimit,
    expiresAt: c.expiresAt,
    challengeCount: challengeCountByCompany.get(c.id) ?? 0,
    participantCount: participantCountByCompany.get(c.id) ?? 0,
    employeeCount: employeeCountByCompany.get(c.id) ?? 0,
  }));
}

export interface CompanyChallengeRow {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  participantCount: number;
}

export async function getCompanyDetail(companyId: string) {
  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) return null;

  const [challengeRows, participantCounts, employeeCount, companyLogins, recentLogins] = await Promise.all([
    db.query.challenges.findMany({
      where: eq(challenges.companyId, companyId),
      orderBy: desc(challenges.startDate),
    }),
    db
      .select({ challengeId: challengeParticipants.challengeId, value: count() })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(eq(challenges.companyId, companyId))
      .groupBy(challengeParticipants.challengeId),
    employeeCountFor(companyId),
    loginCounts(companyId),
    db
      .select({
        fullName: profiles.fullName,
        role: loginEvents.role,
        occurredAt: loginEvents.occurredAt,
      })
      .from(loginEvents)
      .innerJoin(profiles, eq(loginEvents.profileId, profiles.id))
      .where(eq(profiles.companyId, companyId))
      .orderBy(desc(loginEvents.occurredAt))
      .limit(20),
  ]);

  const participantCountByChallenge = new Map(participantCounts.map((r) => [r.challengeId, r.value]));
  const challengeList: CompanyChallengeRow[] = challengeRows.map((c) => ({
    id: c.id,
    title: c.title,
    startDate: c.startDate,
    endDate: c.endDate,
    participantCount: participantCountByChallenge.get(c.id) ?? 0,
  }));

  return { company, challenges: challengeList, employeeCount, logins: companyLogins, recentLogins };
}
