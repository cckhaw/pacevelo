import { NextResponse, type NextRequest } from "next/server";
import { getParticipantBreakdown } from "@/lib/leaderboard-data";

/** A single participant's daily breakdown within one challenge. No auth - mirrors the parent leaderboard route, meant to be shared within a company. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; profileId: string }> },
) {
  const { slug, profileId } = await params;
  const challengeId = request.nextUrl.searchParams.get("challengeId");
  if (!challengeId) {
    return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
  }

  const data = await getParticipantBreakdown(slug, challengeId, profileId);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
