"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AuthErrorCode } from "../errors";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
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

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", "invalid_input");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    console.warn("[login] sign-in failed", { code: error.code, status: error.status });
    redirectWithError("/login", "invalid_credentials");
  }

  redirect("/chat");
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const origin = trustedAppOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/callback`,
    },
  });

  if (error || !data.url) {
    console.warn("[login] google oauth start failed", { code: error?.code, status: error?.status });
    redirectWithError("/login", "oauth_start_failed");
  }

  redirect(data.url);
}
