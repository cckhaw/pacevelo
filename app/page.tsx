import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Trophy,
  Users,
  Watch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoInline, LogoMark } from "@/components/logo";

const FEATURES = [
  {
    icon: Watch,
    title: "Strava-powered activities",
    description:
      "Run, ride, or walk - every synced Strava activity automatically counts toward the challenges an employee has joined.",
  },
  {
    icon: MapPin,
    title: "GPS-verified, not self-reported",
    description:
      "Every entry is backed by a real GPS-tracked route, distance, and time - not a step count anyone can fake by shaking their phone in a drawer.",
  },
  {
    icon: Trophy,
    title: "Live leaderboards",
    description: "Individual and department standings update automatically as activities sync in - no spreadsheets, no manual entry.",
  },
  {
    icon: Users,
    title: "Team & department rankings",
    description: "See how Engineering stacks up against Sales, not just who logged the most distance individually.",
  },
  {
    icon: MessageSquare,
    title: "Slack updates",
    description: "Add a Slack webhook in company settings and your channel gets automated leaderboard updates as challenges progress.",
  },
  {
    icon: ShieldCheck,
    title: "Invite-only enrollment",
    description: "Joining requires an email-verified one-time code, with an optional company-domain restriction so only your team gets in.",
  },
] as const;

const STEPS = [
  {
    title: "Get your onboarding code",
    description: "Contact PaceVelo and we'll set your company up with an onboarding code to get started.",
  },
  {
    title: "Brand your company",
    description: "Add your logo and, if you'd like automated updates, a Slack webhook - all from company settings.",
  },
  {
    title: "Launch a challenge",
    description: "Pick a metric - distance, active time, or elevation - a date range, and which departments it's open to.",
  },
  {
    title: "Share the invite link",
    description: "Employees verify their work email, set a password, and connect Strava. Their activity starts counting right away.",
  },
] as const;

const FAQS = [
  {
    question: "Do employees need to install a PaceVelo app?",
    answer:
      "No - employees just need a Strava account they already use. The PaceVelo dashboard is where they connect it and check their progress.",
  },
  {
    question: "What if someone doesn't want to share their fitness data?",
    answer:
      "Connecting is entirely opt-in. Employees can disconnect Strava at any time from their dashboard, which immediately stops any further syncing.",
  },
  {
    question: "Why Strava instead of just counting steps?",
    answer:
      "A step count is trivially easy to fake - shake a phone in a drawer and watch the leaderboard lie to you. A Strava activity carries a real GPS-tracked route, distance, and time, so a challenge actually reflects who moved, not who gamed a sensor. It's slightly more setup for participants; we think that trade is worth it for a leaderboard people can trust.",
  },
  {
    question: "Which activities count toward a challenge?",
    answer:
      "Every challenge is ranked by distance, active time, or elevation across whichever of Run/Ride/Walk it allows - all sourced from synced Strava activities.",
  },
  {
    question: "Can we restrict who's allowed to join?",
    answer:
      "Yes - an invite link can be limited to a specific work email domain and to specific departments, and joining always requires an email-verified one-time code.",
  },
  {
    question: "How fast can we actually get a challenge live?",
    answer:
      "Once you have an onboarding code, setting up your company and launching a challenge takes a few minutes - there's no integration project to run.",
  },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-wide text-primary">{children}</p>;
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <LogoInline markSize={32} />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
            <Link href="#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground">
              How it works
            </Link>
            <Link href="#faq" className="hover:text-foreground">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-secondary">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Corporate athletic challenges, live in under 5 minutes
              </h1>
              <p className="mt-4 max-w-md text-lg text-muted-foreground">
                Branded running, walking, and cycling challenges powered by GPS-verified Strava activities - with
                real-time leaderboards and Slack updates for your whole company.
              </p>
              <p className="mt-3 flex max-w-md items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Every entry is backed by a real GPS-tracked activity - not a step count anyone can fake.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/admin/signup">
                    Set up your company <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Joining a challenge? Use the invite link your company admin sent you.
              </p>
            </div>

            <Card className="border-primary/10 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogoMark size={28} className="rounded-lg" />
                    <div>
                      <p className="text-sm font-semibold">Autumn Run Challenge</p>
                      <p className="text-xs text-muted-foreground">Strava · Ranked by total distance</p>
                    </div>
                  </div>
                  <Badge>Live</Badge>
                </div>
                <ul className="mt-6 space-y-4">
                  {[
                    { name: "A. Rahman", dept: "Engineering", value: 84.4, pct: 100 },
                    { name: "S. Tan", dept: "Sales", value: 72.9, pct: 86 },
                    { name: "J. Lee", dept: "Marketing", value: 55.8, pct: 66 },
                  ].map((row, i) => (
                    <li key={row.name}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="font-medium">
                          {i + 1}. {row.name}{" "}
                          <span className="font-normal text-muted-foreground">· {row.dept}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">{row.value.toLocaleString()} km</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-center text-xs text-muted-foreground">Illustrative preview</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick facts strip */}
        <section className="border-y bg-background">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-center sm:grid-cols-3 sm:px-6">
            <div>
              <p className="text-3xl font-semibold text-primary">5 minutes</p>
              <p className="mt-1 text-sm text-muted-foreground">From onboarding code to a live challenge</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-primary">GPS-verified</p>
              <p className="mt-1 text-sm text-muted-foreground">Every entry backed by a real tracked activity</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-primary">Real-time</p>
              <p className="mt-1 text-sm text-muted-foreground">Leaderboards and Slack updates as activity syncs</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>Everything a company admin needs</SectionEyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              One dashboard for challenges, leaderboards, and engagement
            </h2>
            <p className="mt-4 text-muted-foreground">
              No wearable to buy, no spreadsheet to maintain. PaceVelo runs on the Strava account your employees
              already have.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-secondary">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Four steps from onboarding code to leaderboard
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step.title}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why PaceVelo */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <SectionEyebrow>Why teams switch to PaceVelo</SectionEyebrow>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Less admin overhead, more people moving
              </h2>
              <p className="mt-4 text-muted-foreground">
                Company challenges usually die in a shared spreadsheet within a week. PaceVelo automates the parts
                that make them fall apart.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "No manually copying Strava data into a spreadsheet every morning.",
                "No extra app for employees to install - they connect an account they already use.",
                "No guessing who's winning - individual and department leaderboards update as activity syncs.",
                "No juggling multiple challenges by hand - a participant's activity counts toward every challenge they've joined.",
                "No leaderboard anyone can fake - every entry is a real GPS-tracked activity, not a self-reported number.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t bg-secondary">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <div className="text-center">
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Common questions</h2>
            </div>
            <div className="mt-10 space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Have a different question?{" "}
              <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
                Get in touch
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Ready to get your team moving?</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Set up your company and launch your first challenge today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/admin/signup">
                Set up your company <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <LogoInline markSize={28} />
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="#features" className="hover:text-foreground">
                Features
              </Link>
              <Link href="#how-it-works" className="hover:text-foreground">
                How it works
              </Link>
              <Link href="#faq" className="hover:text-foreground">
                FAQ
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground sm:text-left">
            © {new Date().getFullYear()} PaceVelo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
