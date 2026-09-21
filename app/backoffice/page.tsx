import Link from "next/link";
import { Building2, KeyRound, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoInline } from "@/components/logo";
import { requireBackoffice } from "@/lib/auth";
import { getBackofficeOverview, getCompaniesOverview } from "@/lib/backoffice-data";
import { signOutBackoffice } from "@/app/backoffice/actions";
import { isPast } from "@/lib/time";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function BackofficeDashboardPage() {
  await requireBackoffice();

  const [overview, companiesList] = await Promise.all([getBackofficeOverview(), getCompaniesOverview()]);

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/backoffice" className="flex items-center gap-2">
            <LogoInline markSize={32} />
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/backoffice/onboarding-codes" className="hover:text-foreground">
              Onboarding codes
            </Link>
            <form action={signOutBackoffice}>
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-xl font-semibold">Back office</h1>
          <p className="text-sm text-muted-foreground">All companies running on PaceVelo.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{overview.companyCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Challenges</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{overview.challengeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{overview.participantCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Logins (7d / 30d)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                HR admins: <span className="font-semibold">{overview.logins.admin7d}</span> /{" "}
                {overview.logins.admin30d}
              </p>
              <p>
                Participants: <span className="font-semibold">{overview.logins.employee7d}</span> /{" "}
                {overview.logins.employee30d}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>Challenge and participant counts, plan limit, and access expiry.</CardDescription>
          </CardHeader>
          <CardContent>
            {companiesList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No companies yet.</p>
            ) : (
              <div className="space-y-3">
                {companiesList.map((c) => {
                  const expired = isPast(c.expiresAt);
                  return (
                    <Link
                      key={c.id}
                      href={`/backoffice/companies/${c.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-secondary/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">/{c.slug}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5" /> {c.challengeCount}
                          {c.challengeLimit != null ? ` / ${c.challengeLimit}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {c.participantCount}
                        </span>
                        <span>Expires {formatDate(c.expiresAt)}</span>
                        {expired ? <Badge variant="secondary">Expired</Badge> : <Badge>Active</Badge>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> Onboarding codes
            </CardTitle>
            <CardDescription>Generate the codes HR admins need to set up a new company.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/backoffice/onboarding-codes">Manage onboarding codes</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
