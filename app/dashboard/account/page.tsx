import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { AccountForms, type PasswordMode } from "@/components/account-forms";
import { getCurrentProfile } from "@/lib/auth";
import { isPlaceholderEmail } from "@/lib/profile-email";
import { signOut } from "@/app/login/actions";

export default async function MyAccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/account");

  const hasRealEmail = !isPlaceholderEmail(profile.email);
  const mode: PasswordMode = profile.passwordHash ? "change" : hasRealEmail ? "add" : "add-email";

  return (
    <div className="min-h-screen bg-secondary">
      <AppNav variant="employee" fullName={profile.fullName} brandHref="/dashboard" signOutAction={signOut} />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="mb-6 text-xl font-semibold">My account</h1>
        <AccountForms email={hasRealEmail ? profile.email : null} mode={mode} />
      </main>
    </div>
  );
}
