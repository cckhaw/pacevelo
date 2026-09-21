import { NextResponse, type NextRequest } from "next/server";
import type { ActivityType } from "@/db/schema";
import { getLeaderboardData } from "@/lib/leaderboard-data";
import { ACTIVITY_TYPES } from "@/lib/validations";

/** Public leaderboard data for /company/[slug]. No auth - this is meant to be shared within a company. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const activityTypeParam = searchParams.get("activityType");
  const activityType = (ACTIVITY_TYPES as readonly string[]).includes(activityTypeParam ?? "")
    ? (activityTypeParam as ActivityType)
    : null;

  const data = await getLeaderboardData(slug, {
    challengeId: searchParams.get("challengeId") ?? undefined,
    activityType,
  });

  if (!data.company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
