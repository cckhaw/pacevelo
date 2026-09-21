import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAdmin } from "@/app/admin/auth-actions";

export function AdminNav({ fullName, hasCompany }: { fullName: string; hasCompany: boolean }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          PaceVelo Admin
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
          <span className="hidden text-sm text-muted-foreground sm:inline">{fullName}</span>
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
