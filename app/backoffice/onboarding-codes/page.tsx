import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateCodeForm } from "@/components/backoffice/generate-code-form";
import { requireBackoffice } from "@/lib/auth";
import { db } from "@/db";

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function BackofficeOnboardingCodesPage() {
  await requireBackoffice();

  const codes = await db.query.onboardingCodes.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: { usedByCompany: { columns: { name: true, slug: true } } },
  });

  return (
    <div className="min-h-screen bg-secondary">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <Link
            href="/backoffice"
            className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="text-xl font-semibold">Onboarding codes</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate a code</CardTitle>
            <CardDescription>HR admins enter this once, when they first set up their company.</CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateCodeForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All codes</CardTitle>
          </CardHeader>
          <CardContent>
            {codes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No codes generated yet.</p>
            ) : (
              <ul className="space-y-2">
                {codes.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <span className="font-mono font-medium">{c.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.challengeLimit != null ? `${c.challengeLimit} challenge(s)` : "Unlimited"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                    {c.usedByCompany ? (
                      <Badge variant="secondary">Used by {c.usedByCompany.name}</Badge>
                    ) : (
                      <Badge>Unused</Badge>
                    )}
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
