import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppNav } from "@/components/nav/app-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { getCompanyEmployeeProgress } from "@/lib/leaderboard-data";
import { signOutAdmin } from "@/app/admin/auth-actions";
import type { MetricType } from "@/db/schema";

// Mirrors components/leaderboard/leaderboard-view.tsx's formatValue - kept
// as its own copy since the two pages don't share a component tree.
function formatProgress(value: number, metricType: MetricType) {
  if (metricType === "total_steps") {
    return `${Math.round(value).toLocaleString()} steps`;
  }
  const rounded = metricType === "active_time_mins" ? Math.round(value) : Math.round(value * 10) / 10;
  const unit = metricType === "total_distance_km" ? "km" : metricType === "active_time_mins" ? "min" : "m";
  return `${rounded.toLocaleString()} ${unit}`;
}

export default async function AdminEmployeesPage() {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }

  const employees = await getCompanyEmployeeProgress(profile.companyId);

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav variant="admin" fullName={profile.fullName} hasCompany brandHref="/admin" signOutAction={signOutAdmin} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/admin"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} employee{employees.length === 1 ? "" : "s"} joined.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All employees</CardTitle>
            <CardDescription>Which challenges each employee has joined, and their progress so far.</CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No employees have joined yet.</p>
            ) : (
              <div className="space-y-3">
                {employees.map((employee) => (
                  <div key={employee.profileId} className="rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{employee.fullName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {employee.email}
                        {employee.department ? ` · ${employee.department}` : ""}
                      </p>
                    </div>
                    {employee.challenges.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Not enrolled in any challenge yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 border-t pt-2">
                        {employee.challenges.map((challenge) => (
                          <li key={challenge.challengeId} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2">
                              {challenge.title}
                              {!challenge.isActive ? (
                                <Badge variant="secondary" className="text-xs">
                                  Ended
                                </Badge>
                              ) : null}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              {formatProgress(challenge.value, challenge.metricType)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
