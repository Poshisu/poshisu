"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { trustedAppOrigin } from "@/lib/auth/origin";
import { isDebugSurfaceAllowed } from "@/lib/env/debugSurface";
import { withServerActionLogging } from "@/lib/errors/serverAction";
import { createClient } from "@/lib/supabase/server";
import type { AuthErrorCode } from "../errors";
import { mapSignupError } from "./errorMap";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

function redirectWithError(pathname: string, code: AuthErrorCode, debug?: string): never {
  const params = new URLSearchParams({ error: code });
  // Surface the raw provider code in non-prod environments so the developer
  // can see exactly why a signup failed without opening Vercel logs. Never
  // do this in production — it can leak internals to real users.
  if (debug && isDebugSurfaceAllowed()) {
    params.set("debug", debug);
  }
  redirect(`${pathname}?${params.toString()}`);
}

export const signupAction = withServerActionLogging("signup", async (formData: FormData) => {
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
    // Log the full error server-side for triage (Vercel Runtime Logs + Sentry).
    // The client only ever sees our mapped opaque code — we never surface raw
    // Supabase messages because they can reveal account existence.
    console.warn("[signup] failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    redirectWithError("/signup", mapSignupError(error.code), error.code ?? "unknown");
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
});
