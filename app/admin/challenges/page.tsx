import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { METRIC_TYPE_LABELS } from "@/lib/validations";
import type { MetricType } from "@/types/database";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ChallengesPage() {
  const { supabase, profile } = await requireAdmin();

  if (!profile.company_id) {
    redirect("/admin/company");
  }

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("start_date", { ascending: false });

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.full_name} hasCompany={Boolean(profile.company_id)} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Challenges</h1>
          <Button asChild>
            <Link href="/admin/challenges/new">
              <Plus className="h-4 w-4" /> New challenge
            </Link>
          </Button>
        </div>

        {!challenges || challenges.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No challenges yet.{" "}
              <Link href="/admin/challenges/new" className="text-primary underline-offset-4 hover:underline">
                Create your first one
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{challenge.title}</CardTitle>
                    <Badge variant={challenge.is_active ? "default" : "secondary"}>
                      {challenge.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatDate(challenge.start_date)} – {formatDate(challenge.end_date)} ·{" "}
                    {METRIC_TYPE_LABELS[challenge.metric_type as MetricType]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {challenge.allowed_activities.map((activity) => (
                    <Badge key={activity} variant="outline">
                      {activity}
                    </Badge>
                  ))}
                  {challenge.target_departments?.length ? (
                    <span className="ml-2">Targeting: {challenge.target_departments.join(", ")}</span>
                  ) : (
                    <span className="ml-2">Open to the whole company</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
