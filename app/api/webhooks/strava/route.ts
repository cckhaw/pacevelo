import { NextResponse, after, type NextRequest } from "next/server";
import {
  processActivityChanged,
  processActivityDeleted,
  processAthleteDeauthorized,
} from "@/lib/strava/webhook-processing";

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
 *
 * Handled:
 * - activity create / update: re-fetch and reconcile the activity.
 * - activity delete: remove it. Strava also sends this when an activity is
 *   made private ("Only You"), and a create again if it's made visible.
 * - athlete update with authorized=false: the athlete revoked PaceVelo on
 *   Strava, so drop their stored connection.
 */
export async function POST(request: NextRequest) {
  let event: StravaWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Strava doesn't sign event payloads, so the subscription id (issued once
  // when the subscription is created) is the only thing tying an event to
  // ours. Optional so existing deployments keep working until it's set.
  const expectedSubscriptionId = process.env.STRAVA_WEBHOOK_SUBSCRIPTION_ID;
  if (expectedSubscriptionId && String(event.subscription_id) !== expectedSubscriptionId) {
    return NextResponse.json({ error: "Unknown subscription" }, { status: 403 });
  }

  const run = (work: () => Promise<void>) =>
    after(() =>
      work().catch((err) => {
        console.error("Strava webhook processing failed", { event, err });
      }),
    );

  if (event.object_type === "activity") {
    if (event.aspect_type === "delete") {
      run(() => processActivityDeleted(event.owner_id, event.object_id));
    } else {
      run(() => processActivityChanged(event.owner_id, event.object_id));
    }
  } else if (
    event.object_type === "athlete" &&
    event.aspect_type === "update" &&
    event.updates?.authorized === "false"
  ) {
    run(() => processAthleteDeauthorized(event.owner_id));
  }

  return NextResponse.json({ received: true });
}
