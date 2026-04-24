import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { authErrorMessage } from "../errors";
import { loginAction, signInWithGoogleAction } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Nourish to continue your health journey.",
};

type LoginSearchParams = { error?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  const { error } = await searchParams;
  const errorMessage = authErrorMessage(error);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your health journey.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <form action={loginAction} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? "login-error" : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={1}
              aria-invalid={errorMessage ? true : undefined}
              aria-describedby={errorMessage ? "login-error" : undefined}
            />
          </div>
          {errorMessage ? (
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <SubmitButton className="w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
