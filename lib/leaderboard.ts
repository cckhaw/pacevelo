import type { ActivityType, MetricType } from "@/db/schema";

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

export function buildIndividualStandings(
  rows: LeaderboardActivityRow[],
  metricType: MetricType,
): IndividualStanding[] {
  const byProfile = new Map<string, IndividualStanding>();

  for (const row of rows) {
    const value = metricValue(row, metricType);
    const existing = byProfile.get(row.profileId);
    if (existing) {
      existing.value += value;
      existing.activityCount += 1;
    } else {
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

  return [...byProfile.values()].sort((a, b) => b.value - a.value);
}

export function buildDepartmentStandings(
  rows: LeaderboardActivityRow[],
  metricType: MetricType,
): DepartmentStanding[] {
  const byDept = new Map<string, { value: number; activityCount: number; members: Set<string> }>();

  for (const row of rows) {
    const department = row.department ?? "Unassigned";
    const value = metricValue(row, metricType);
    const existing = byDept.get(department);
    if (existing) {
      existing.value += value;
      existing.activityCount += 1;
      existing.members.add(row.profileId);
    } else {
      byDept.set(department, { value, activityCount: 1, members: new Set([row.profileId]) });
    }
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
