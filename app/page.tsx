import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-secondary px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Activity className="h-8 w-8" />
      </div>
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
          <Link href="/login">I have an invite link</Link>
        </Button>
      </div>
    </div>
  );
}
