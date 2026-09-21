import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { updateChallenge } from "@/app/admin/challenges/actions";

export default async function EditChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }

  const { id } = await params;
  const challenge = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, id), eq(challenges.companyId, profile.companyId)),
  });

  if (!challenge) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.fullName} hasCompany={Boolean(profile.companyId)} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Edit challenge</CardTitle>
            <CardDescription>Changes apply immediately to the live leaderboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChallengeForm action={updateChallenge.bind(null, challenge.id)} challenge={challenge} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
