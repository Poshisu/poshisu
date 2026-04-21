import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { authErrorMessage } from "../errors";
import { signInWithGoogleAction } from "../login/actions";
import { signupAction } from "./actions";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Nourish account to start getting personalised nutrition coaching.",
};

type SignupSearchParams = { error?: string; "check-email"?: string };

export default async function SignupPage({ searchParams }: { searchParams: Promise<SignupSearchParams> }) {
  const { error, "check-email": checkEmail } = await searchParams;
  const errorMessage = authErrorMessage(error);
  const passwordDescribedBy = errorMessage ? "password-hint signup-error" : "password-hint";

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Create your account</CardTitle>
        <CardDescription>Get personalised nutrition coaching in under 2 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checkEmail ? (
          <p role="status" className="rounded-md border border-border bg-muted/50 p-3 text-sm">
            Check your inbox to confirm your email, then come back to finish setup.
          </p>
        ) : null}

        <form action={signInWithGoogleAction}>
          <SubmitButton variant="outline" className="w-full" pendingLabel="Redirecting to Google…">
            Continue with Google
          </SubmitButton>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" aria-hidden="true" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span aria-hidden="true" className="bg-card px-2 text-muted-foreground">
              or
            </span>
          </div>
        </div>

        <form action={signupAction} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? "signup-error" : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={passwordDescribedBy}
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
          {errorMessage ? (
            <p id="signup-error" role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <SubmitButton className="w-full" pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
