import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoInline, LogoMark } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-secondary">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <LogoInline markSize={32} />
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <LogoMark size={96} className="mb-6 rounded-2xl" />
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Corporate athletic challenges, live in under 5 minutes
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Branded running, walking, and cycling challenges powered by Strava — with real-time leaderboards for your
          whole company.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/admin/signup">
              Set up your company <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Joining a challenge? Use the invite link your HR admin sent you.
        </p>
      </div>
    </div>
  );
}
