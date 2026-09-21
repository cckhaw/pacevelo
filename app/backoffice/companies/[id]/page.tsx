import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyLimitsForm } from "@/components/backoffice/company-limits-form";
import { requireBackoffice } from "@/lib/auth";
import { getCompanyDetail } from "@/lib/backoffice-data";
import { isPast } from "@/lib/time";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: Date) {
  return value.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function BackofficeCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBackoffice();

  const { id } = await params;
  const detail = await getCompanyDetail(id);
  if (!detail) {
    notFound();
  }

  const { company, challenges, logins, recentLogins } = detail;
  const expired = isPast(company.expiresAt);

  return (
    <div className="min-h-screen bg-secondary">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <Link
            href="/backoffice"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to companies
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{company.name}</h1>
            {expired ? <Badge variant="secondary">Expired</Badge> : <Badge>Active</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">/{company.slug}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>Adjust this company&apos;s challenge cap and access expiry.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyLimitsForm
              companyId={company.id}
              challengeLimit={company.challengeLimit}
              expiresAt={company.expiresAt}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit frequency</CardTitle>
            <CardDescription>Login events for this company&apos;s HR admins and participants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              HR admins: <span className="font-semibold">{logins.admin7d}</span> logins in the last 7 days ·{" "}
              <span className="font-semibold">{logins.admin30d}</span> in the last 30
            </p>
            <p>
              Participants: <span className="font-semibold">{logins.employee7d}</span> logins in the last 7 days ·{" "}
              <span className="font-semibold">{logins.employee30d}</span> in the last 30
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>{challenges.length} challenge(s) set up so far.</CardDescription>
          </CardHeader>
          <CardContent>
            {challenges.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No challenges yet.</p>
            ) : (
              <ul className="space-y-3">
                {challenges.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.startDate)} – {formatDate(c.endDate)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {c.participantCount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" /> Recent logins
            </CardTitle>
            <CardDescription>Most recent 20 sign-ins from this company.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogins.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No logins recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentLogins.map((event, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      {event.fullName} <span className="text-xs text-muted-foreground">({event.role})</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
