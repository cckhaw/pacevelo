import { NextResponse, after, type NextRequest } from "next/server";
import { processActivityCreated } from "@/lib/strava/webhook-processing";

/**
 * Strava calls this with a GET request once, right after we create a push
 * subscription, to confirm we control the callback URL. See README for how
 * the subscription itself gets created (a one-time, account-level call
 * against Strava's API, not something end users trigger).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && challenge && expectedToken && token === expectedToken) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}

/**
 * Receives activity/athlete change events. Strava requires a 200 response
 * within two seconds, so the actual sync work runs in `after()` once the
 * response has already been sent.
 */
export async function POST(request: NextRequest) {
  let event: StravaWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.object_type === "activity" && event.aspect_type === "create") {
    after(() =>
      processActivityCreated(event.owner_id, event.object_id).catch((err) => {
        console.error("Strava webhook processing failed", { event, err });
      }),
    );
  }

  return NextResponse.json({ received: true });
}
