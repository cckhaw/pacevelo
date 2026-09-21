import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  strava_access_denied: "You cancelled the Strava connection. You can try again anytime.",
  invalid_oauth_state: "Your sign-in link expired. Please try connecting again.",
  missing_oauth_params: "Something went wrong talking to Strava. Please try again.",
  strava_exchange_failed: "We couldn't verify your Strava account. Please try again.",
  strava_account_already_linked: "That Strava account is already connected to another PaceVelo profile.",
  user_creation_failed: "We couldn't create your PaceVelo account. Please try again.",
  profile_update_failed: "We couldn't save your Strava connection. Please try again.",
  session_creation_failed: "We connected Strava but couldn't sign you in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? "Something went wrong. Please try again." : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Log in to PaceVelo</CardTitle>
          <CardDescription>View your challenges and leaderboards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
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
