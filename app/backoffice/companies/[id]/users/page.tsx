import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRowActions } from "@/components/backoffice/user-row-actions";
import { requireBackoffice } from "@/lib/auth";
import { getCompanyUsers } from "@/lib/backoffice-data";
import { db } from "@/db";
import { companies } from "@/db/schema";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function BackofficeCompanyUsersPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBackoffice();

  const { id } = await params;
  const [company, users] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, id), columns: { id: true, name: true } }),
    getCompanyUsers(id),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-secondary">
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div>
          <Link
            href={`/backoffice/companies/${id}`}
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to {company.name}
          </Link>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} account(s) at {company.name}.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
            <CardDescription>
              Edit details, reset a password, disconnect Strava/Google Health, or delete an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{user.fullName}</p>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "HR admin" : "Employee"}
                        </Badge>
                        {user.stravaConnected ? (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Strava
                          </Badge>
                        ) : null}
                        {user.googleHealthConnected ? (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Google Health
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.department ? `${user.department} · ` : ""}Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <UserRowActions companyId={id} user={user} />
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
