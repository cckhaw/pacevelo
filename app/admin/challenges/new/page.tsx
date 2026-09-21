import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeForm } from "@/components/admin/challenge-form";
import { requireAdmin } from "@/lib/auth";
import { createChallenge } from "@/app/admin/challenges/actions";

export default async function NewChallengePage() {
  const { profile } = await requireAdmin();

  if (!profile.companyId) {
    redirect("/admin/company");
  }

  return (
    <div className="min-h-screen bg-secondary">
      <AdminNav fullName={profile.fullName} hasCompany={Boolean(profile.companyId)} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Create a challenge</CardTitle>
            <CardDescription>Set the dates, the metric that decides the leaderboard, and who it&apos;s for.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChallengeForm action={createChallenge} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
