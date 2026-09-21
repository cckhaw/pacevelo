import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoFull } from "@/components/logo";
import { signOutAdmin } from "@/app/admin/auth-actions";

export function AdminNav({ fullName, hasCompany }: { fullName: string; hasCompany: boolean }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoFull height={28} />
        </Link>
        {hasCompany ? (
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/admin/challenges" className="hover:text-foreground">
              Challenges
            </Link>
            <Link href="/admin/company" className="hover:text-foreground">
              Company Settings
            </Link>
          </nav>
        ) : null}
        <div className="flex items-center gap-3">
          <Link href="/admin/account" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            {fullName}
          </Link>
          <form action={signOutAdmin}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
