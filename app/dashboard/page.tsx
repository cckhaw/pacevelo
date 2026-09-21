import { redirect } from "next/navigation";
import { CheckCircle2, Watch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getValidStravaAccessToken } from "@/lib/strava/tokens";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, department, strava_athlete_id, company:companies(name, logo_url)")
    .eq("id", user.id)
    .single();

  let tokenStatus: "connected" | "error" = "error";
  if (profile?.strava_athlete_id) {
    try {
      await getValidStravaAccessToken(user.id);
      tokenStatus = "connected";
    } catch {
      tokenStatus = "error";
    }
  }

  const company = Array.isArray(profile?.company) ? profile.company[0] : profile?.company;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {welcome ? (
        <p className="mb-6 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Welcome to PaceVelo! Your Strava account is connected.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {profile?.full_name ?? "Your account"}
          </CardTitle>
          <CardDescription>
            {company?.name ? `Member of ${company.name}` : "Not yet linked to a company"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="flex items-center gap-2 text-sm">
              <Watch className="h-4 w-4" /> Strava connection
            </span>
            {tokenStatus === "connected" ? (
              <Badge className="gap-1 bg-primary text-primary-foreground">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>

          {profile?.department ? (
            <div className="rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Department: </span>
              {profile.department}
            </div>
          ) : null}

          {!company ? (
            <p className="text-sm text-muted-foreground">
              Ask your HR admin for your company&apos;s invite link to join a challenge.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
