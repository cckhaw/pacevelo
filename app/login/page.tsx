import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo";
import { signOutAndReconnectStrava, signOutAndReconnectGoogleHealth } from "@/app/login/actions";

const ERROR_MESSAGES: Record<string, (hint?: string) => string> = {
  strava_access_denied: () => "You cancelled the Strava connection. You can try again anytime.",
  invalid_oauth_state: () => "Your sign-in link expired. Please try connecting again.",
  missing_oauth_params: () => "Something went wrong talking to Strava. Please try again.",
  strava_exchange_failed: () => "We couldn't verify your Strava account. Please try again.",
  strava_account_already_linked_with_password: (hint) =>
    `That Strava account is already connected to a different PaceVelo account${hint ? ` (${hint})` : ""}. If that's you, log in below with that account's email and password instead. If you meant to connect a different Strava account, disconnect PaceVelo from the other one first in Strava's settings (My Apps).`,
  strava_account_already_linked_no_password: (hint) =>
    `That Strava account is already connected to a different PaceVelo account${hint ? ` (${hint})` : ""} that has no password set. If that's you, use the button below to sign into that account directly. If you meant to connect a different Strava account, disconnect PaceVelo from the other one first in Strava's settings (My Apps).`,
  google_health_access_denied: () => "You cancelled the Google Health connection. You can try again anytime.",
  google_health_exchange_failed: () => "We couldn't verify your Google Health account. Please try again.",
  google_health_account_already_linked_with_password: (hint) =>
    `That Google Health account is already connected to a different PaceVelo account${hint ? ` (${hint})` : ""}. If that's you, log in below with that account's email and password instead. If you meant to connect a different Google Health account, disconnect PaceVelo from that Google account's connected apps first.`,
  google_health_account_already_linked_no_password: (hint) =>
    `That Google Health account is already connected to a different PaceVelo account${hint ? ` (${hint})` : ""} that has no password set. If that's you, use the button below to sign into that account directly. If you meant to connect a different Google Health account, disconnect PaceVelo from that Google account's connected apps first.`,
  employee_limit_reached: () => "Your company has reached its employee limit. Ask your HR admin to contact PaceVelo.",
  user_creation_failed: () => "We couldn't create your PaceVelo account. Please try again.",
  profile_update_failed: () => "We couldn't save your connection. Please try again.",
  session_creation_failed: () => "We connected your account but couldn't sign you in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; hint?: string }>;
}) {
  const { error, hint } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? (() => "Something went wrong. Please try again."))(hint) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <LogoMark size={48} className="mb-2 rounded-xl" />
          <CardTitle className="text-xl">Log in to PaceVelo</CardTitle>
          <CardDescription>View your challenges and leaderboards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          {error === "strava_account_already_linked_no_password" ? (
            <form action={signOutAndReconnectStrava}>
              <Button type="submit" variant="outline" className="w-full">
                Sign out & connect with Strava
              </Button>
            </form>
          ) : null}

          {error === "google_health_account_already_linked_no_password" ? (
            <form action={signOutAndReconnectGoogleHealth}>
              <Button type="submit" variant="outline" className="w-full">
                Sign out & connect with Google Health
              </Button>
            </form>
          ) : null}

          <LoginForm />

          <p className="text-center text-xs text-muted-foreground">
            New here? You&apos;ll need a challenge invite link from your HR admin to sign up.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Are you an HR admin?{" "}
            <Link href="/admin/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
