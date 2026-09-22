import { AppNav } from "@/components/nav/app-nav";
import { AccountForms } from "@/components/admin/account-forms";
import { requireAdmin } from "@/lib/auth";
import { signOutAdmin } from "@/app/admin/auth-actions";

export default async function AdminAccountPage() {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav
        variant="admin"
        fullName={profile.fullName}
        hasCompany={Boolean(profile.companyId)}
        brandHref="/admin"
        signOutAction={signOutAdmin}
      />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-xl font-semibold">Account settings</h1>
        <AccountForms email={profile.email} />
      </main>
    </div>
  );
}
