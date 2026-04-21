"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AuthErrorCode } from "../errors";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

function redirectWithError(pathname: string, code: AuthErrorCode): never {
  const params = new URLSearchParams({ error: code });
  redirect(`${pathname}?${params.toString()}`);
}

/**
 * Returns the origin to use for auth redirects. We never trust the request
 * `Origin` header here because a malicious client can set it to an arbitrary
 * host, which would cause confirmation / OAuth emails to link to attacker
 * infrastructure.
 */
function trustedAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return raw.replace(/\/$/, "");
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/signup", "invalid_input");
  }

  const supabase = await createClient();
  const origin = trustedAppOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/callback?next=/onboarding`,
    },
  });

  if (error) {
    console.warn("[signup] failed", { code: error.code, status: error.status });
    redirectWithError("/signup", "signup_failed");
  }

  // Supabase returns data.user with empty identities[] when the email is already
  // registered. Do not reveal that — always show the "check your email" state so
  // an attacker can't probe for account existence.
  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    redirect("/signup?check-email=1");
  }

  // If email confirmation is disabled the user is signed in immediately.
  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/signup?check-email=1");
}
