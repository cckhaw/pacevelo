import type { ActivityType, MetricType } from "@/db/schema";

export interface RosterMember {
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  department: string | null;
}

export interface LeaderboardActivityRow {
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  department: string | null;
  type: ActivityType;
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationGainMeters: number;
}

export interface IndividualStanding {
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  department: string | null;
  value: number;
  activityCount: number;
}

export interface DepartmentStanding {
  department: string;
  value: number;
  activityCount: number;
  memberCount: number;
}

function metricValue(
  row: Pick<LeaderboardActivityRow, "distanceMeters" | "movingTimeSeconds" | "elevationGainMeters">,
  metricType: MetricType,
): number {
  switch (metricType) {
    case "total_distance_km":
      return row.distanceMeters / 1000;
    case "active_time_mins":
      return row.movingTimeSeconds / 60;
    case "elevation_m":
      return row.elevationGainMeters;
  }
}

/** Builds individual standings for every enrolled participant, including those with no synced activity yet (shown at zero). */
export function buildIndividualStandings(
  roster: RosterMember[],
  rows: LeaderboardActivityRow[],
  metricType: MetricType,
): IndividualStanding[] {
  const byProfile = new Map<string, IndividualStanding>();

  for (const member of roster) {
    byProfile.set(member.profileId, {
      profileId: member.profileId,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl,
      department: member.department,
      value: 0,
      activityCount: 0,
    });
  }

  for (const row of rows) {
    const value = metricValue(row, metricType);
    const existing = byProfile.get(row.profileId);
    if (existing) {
      existing.value += value;
      existing.activityCount += 1;
    } else {
      // Credited activity for someone no longer in the roster (e.g. left the
      // company) - still show them rather than silently dropping their score.
      byProfile.set(row.profileId, {
        profileId: row.profileId,
        fullName: row.fullName,
        avatarUrl: row.avatarUrl,
        department: row.department,
        value,
        activityCount: 1,
      });
    }
  }

  return [...byProfile.values()].sort((a, b) => b.value - a.value || a.fullName.localeCompare(b.fullName));
}

/** Builds department standings, counting every enrolled participant as a member even before they've logged an activity. */
export function buildDepartmentStandings(
  roster: RosterMember[],
  rows: LeaderboardActivityRow[],
  metricType: MetricType,
): DepartmentStanding[] {
  const byDept = new Map<string, { value: number; activityCount: number; members: Set<string> }>();

  function bucket(department: string) {
    let entry = byDept.get(department);
    if (!entry) {
      entry = { value: 0, activityCount: 0, members: new Set() };
      byDept.set(department, entry);
    }
    return entry;
  }

  for (const member of roster) {
    bucket(member.department ?? "Unassigned").members.add(member.profileId);
  }

  for (const row of rows) {
    const value = metricValue(row, metricType);
    const entry = bucket(row.department ?? "Unassigned");
    entry.value += value;
    entry.activityCount += 1;
    entry.members.add(row.profileId);
  }

  return [...byDept.entries()]
    .map(([department, data]) => ({
      department,
      value: data.value,
      activityCount: data.activityCount,
      memberCount: data.members.size,
    }))
    .sort((a, b) => b.value - a.value);
}
