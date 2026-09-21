import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/logo";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <LogoMark size={48} className="mb-2 rounded-xl" />
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>Choose a new password for your PaceVelo account.</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-destructive">
              This reset link is missing its token.{" "}
              <Link href="/forgot-password" className="font-medium underline-offset-4 hover:underline">
                Request a new one
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
