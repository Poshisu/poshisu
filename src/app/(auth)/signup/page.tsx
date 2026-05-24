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

type SignupSearchParams = { error?: string; debug?: string; "check-email"?: string };

const MAX_DEBUG_LEN = 64;
const SAFE_DEBUG = /^[a-z0-9_]+$/i;

export default async function SignupPage({ searchParams }: { searchParams: Promise<SignupSearchParams> }) {
  const { error, debug, "check-email": checkEmail } = await searchParams;
  const errorMessage = authErrorMessage(error);
  const passwordDescribedBy = errorMessage ? "password-hint signup-error" : "password-hint";
  // Only render the debug code if it matches our opaque code grammar — keeps
  // an attacker from injecting arbitrary text into the page via the URL.
  const safeDebug =
    debug && debug.length <= MAX_DEBUG_LEN && SAFE_DEBUG.test(debug) ? debug : null;
  const showSignInHint = error === "signup_email_in_use";

  return (
    <Card className="border-[color:var(--border-soft)] bg-[color:var(--surface-raised)] shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle as="h1" className="text-4xl text-[color:var(--foreground)]">Create account</CardTitle>
        <CardDescription className="text-[color:var(--muted-foreground)]">Set up your coach in under two minutes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checkEmail ? (
          <p role="status" className="rounded-xl border border-[var(--border-soft)] bg-[#101915] p-3 text-sm text-[#c9d7cf]">
            Check your inbox to confirm your email, then come back to finish setup.
          </p>
        ) : null}

        <form action={signInWithGoogleAction}>
          <SubmitButton variant="outline" className="w-full bg-[#0f1713] text-[#e7efe9]" pendingLabel="Redirecting to Google…">
            Continue with Google
          </SubmitButton>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" aria-hidden="true" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span aria-hidden="true" className="bg-[color:var(--surface-raised)] px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
              Or sign up with email
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
            <p id="password-hint" className="text-xs text-[color:var(--muted-foreground)]">
              At least 8 characters.
            </p>
          </div>
          {errorMessage ? (
            <div id="signup-error" role="alert" className="space-y-1">
              <p className="rounded-xl border border-[#e4b8b0] bg-[#f3e3e1] p-4 text-base text-[#be3f31]">{errorMessage}</p>
              {showSignInHint ? (
                <p className="text-sm">
                  <Link href="/login" className="font-medium text-[#2f7f5a] underline underline-offset-4">
                    Sign in instead
                  </Link>
                </p>
              ) : null}
              {safeDebug ? (
                <p className="text-xs text-muted-foreground">
                  Debug (preview only): <code className="font-mono">{safeDebug}</code>
                </p>
              ) : null}
            </div>
          ) : null}
          <SubmitButton className="w-full" pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="text-sm text-[color:var(--muted-foreground)]">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#2f7f5a] underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
